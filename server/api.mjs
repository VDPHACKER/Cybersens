// API JSON de CyberSens : comptes, sessions, progression, certificats, quiz.
// Monté sous /api par server/index.mjs (production) et par vite.config.ts (développement).
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, transaction, getServerSecret, backupTo } from './db.mjs';
import { getCourse, isValidLesson, gradeExam } from './courses.mjs';
import { HttpError } from './httpError.mjs';
import { checkOrigin } from './csrf.mjs';
import { hashPassword, verifyPassword } from './passwords.mjs';
import { getNews } from './news.mjs';
import { answerRoom, createRoom, joinRoom, leaveRoom, openStream, startRoom } from './rooms.mjs';
import { verifyGoogleIdToken } from './google.mjs';
import { mailConfigured, publicUrl, sendMail } from './mail.mjs';

// ---------- Paramètres ----------
// Firebase Hosting ne transmet à Cloud Run que le cookie nommé « __session » : SESSION_COOKIE_NAME=__session
const SESSION_COOKIE = /^[\w-]{1,40}$/.test(process.env.SESSION_COOKIE_NAME || '')
  ? process.env.SESSION_COOKIE_NAME
  : 'cs_session';
const SESSION_DAYS = 30;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_AVATAR_CHARS = 400_000; // ≈ 300 Ko d'image en data URL
const MIN_PASSWORD = 12;
const RESET_TTL_MS = 30 * 60_000;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60_000;
const ROLES = new Set(['Particulier', 'Étudiant', 'Professionnel', 'Entreprise']);
const QUIZ_MODES = new Set(['Solo', 'Multi']);
const TOPICS = new Set(['general', 'question', 'astuce', 'alerte']);
// Points qu'un membre peut déclarer par jour via l'API (quiz, jeux, leçons). Les examens créditent leurs points côté serveur.
const DAILY_POINTS_CAP = 1500;

const RESET_MESSAGES = {
  fr: (link) => ({
    subject: 'CyberSens : réinitialisation de votre mot de passe',
    text: `Bonjour,

Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 30 minutes, à usage unique) :
${link}

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.

CyberSens`,
  }),
  en: (link) => ({
    subject: 'CyberSens: reset your password',
    text: `Hello,

To choose a new password, open this link (valid for 30 minutes, single use):
${link}

If you did not request this, ignore this message: your password stays unchanged.

CyberSens`,
  }),
  es: (link) => ({
    subject: 'CyberSens: restablecer su contraseña',
    text: `Hola,

Para elegir una nueva contraseña, abra este enlace (válido 30 minutos, de un solo uso):
${link}

Si no lo solicitó, ignore este mensaje: su contraseña no cambia.

CyberSens`,
  }),
};
const resetMessage = (lang, link) => RESET_MESSAGES[lang](link);

// ---------- Utilitaires HTTP ----------
const send = (res, status, data, headers = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(data));
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    if (!(req.headers['content-type'] || '').includes('application/json'))
      return reject(new HttpError(415, 'JSON attendu'));
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.removeAllListeners('data');
        req.resume();
        reject(new HttpError(413, 'Requête trop volumineuse'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
        resolve(body);
      } catch {
        reject(new HttpError(400, 'JSON invalide'));
      }
    });
    req.on('error', reject);
  });

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );

const clientIp = (req, trustProxy) =>
  (trustProxy &&
    String(req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()) ||
  req.socket.remoteAddress ||
  'inconnu';

const isHttps = (req, trustProxy) =>
  req.socket.encrypted || (trustProxy && req.headers['x-forwarded-proto'] === 'https');

// Limitation de débit en mémoire par clé (IP ou utilisateur)
const buckets = new Map();
const rateLimit = (key, max, windowMs) => {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > 50_000) buckets.clear();
    return;
  }
  if (++b.count > max) throw new HttpError(429, 'Trop de requêtes, réessayez plus tard');
};

// ---------- Validation ----------
const str = (v, { min = 0, max = 200, field = 'champ' } = {}) => {
  if (typeof v !== 'string') throw new HttpError(400, `${field} invalide`);
  const s = v.trim().replace(/\s+/g, ' ');
  if (s.length < min || s.length > max)
    throw new HttpError(400, `${field} : entre ${min} et ${max} caractères`);
  return s;
};
const int = (v, min, max, field) => {
  if (!Number.isInteger(v) || v < min || v > max) throw new HttpError(400, `${field} invalide`);
  return v;
};
const email = (v) => {
  const e = str(v, { min: 3, max: 254, field: 'E-mail' }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new HttpError(400, 'Adresse e-mail invalide');
  return e;
};
const password = (v, { name, mail }) => {
  if (typeof v !== 'string' || v.length < MIN_PASSWORD)
    throw new HttpError(400, `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`);
  if (v.length > 128)
    throw new HttpError(400, 'Le mot de passe ne doit pas dépasser 128 caractères.');
  const lower = v.toLowerCase();
  const user = mail.split('@')[0];
  if (user.length >= 3 && lower.includes(user))
    throw new HttpError(400, 'Le mot de passe ne doit pas contenir votre adresse e-mail.');
  const first = name.split(' ')[0].toLowerCase();
  if (first.length >= 3 && lower.includes(first))
    throw new HttpError(400, 'Le mot de passe ne doit pas contenir votre nom.');
  return v;
};
const avatar = (v) => {
  if (v === null) return null;
  if (typeof v !== 'string' || v.length > MAX_AVATAR_CHARS)
    throw new HttpError(400, 'Photo de profil trop volumineuse');
  if (
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
    /^https:\/\/images\.unsplash\.com\/[\w\-./?=&%]+$/.test(v)
  )
    return v;
  throw new HttpError(400, 'Format de photo non autorisé');
};
const settings = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new HttpError(400, 'Réglages invalides');
  const out = {};
  if ('theme' in v) out.theme = v.theme === 'dark' ? 'dark' : 'light';
  if ('language' in v) out.language = ['fr', 'en', 'es'].includes(v.language) ? v.language : 'fr';
  if ('bookmarks' in v) {
    if (!Array.isArray(v.bookmarks) || v.bookmarks.length > 200)
      throw new HttpError(400, 'Favoris invalides');
    out.bookmarks = v.bookmarks.filter((b) => typeof b === 'string' && b.length <= 64);
  }
  if ('defaultQuizCount' in v)
    out.defaultQuizCount = int(v.defaultQuizCount, 1, 50, 'Nombre de questions');
  if ('defaultQuizDifficulty' in v)
    out.defaultQuizDifficulty = str(v.defaultQuizDifficulty, { max: 20, field: 'Difficulté' });
  if ('onboarded' in v) out.onboarded = !!v.onboarded;
  if ('showInLeaderboard' in v) out.showInLeaderboard = !!v.showInLeaderboard;
  return out;
};

// Texte libre multi-lignes (messages de la communauté) : garde les retours à la ligne, retire les caractères de contrôle
const longText = (v, { min = 1, max = 1000, field = 'Message' } = {}) => {
  if (typeof v !== 'string') throw new HttpError(400, `${field} invalide`);
  const s = v
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (s.length < min || s.length > max)
    throw new HttpError(400, `${field} : entre ${min} et ${max} caractères`);
  return s;
};

// Nom affiché aux autres membres : prénom + initiale (jamais l'e-mail ni le nom complet)
const publicName = (name) => {
  const [first, ...rest] = String(name).trim().split(/\s+/);
  const initial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : '';
  return `${first}${initial}`;
};

// ---------- Mots de passe ----------
// Empreinte factice : même temps de calcul que l'e-mail existe ou non (pas d'énumération des comptes)
let dummyHash;
const getDummyHash = async () =>
  (dummyHash ??= await hashPassword(crypto.randomBytes(16).toString('hex')));

// ---------- Sessions ----------
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const createSession = (res, req, userId, trustProxy) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    userId,
    expires.toISOString(),
  );
  const secure = isHttps(req, trustProxy) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure}`,
  );
};

const clearSessionCookie = (res) =>
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);

/** Utilisateur connecté (ou null) à partir du cookie de session. */
export const getSessionUser = (req) => {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token || token.length > 100) return null;
  const row = db
    .prepare(
      `
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString());
  return row || null;
};

const requireUser = (req) => {
  const user = getSessionUser(req);
  if (!user) throw new HttpError(401, 'Session expirée, veuillez vous reconnecter');
  return user;
};

// Administrateurs : liste d'e-mails dans ADMIN_EMAILS (séparés par des virgules).
// Sans cette variable, les routes d'administration sont désactivées (404).
const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
const isAdmin = (user) => adminEmails().includes(user.email.toLowerCase());
const requireAdmin = (req) => {
  if (adminEmails().length === 0) throw new HttpError(404, 'Route inconnue');
  const user = requireUser(req);
  if (!isAdmin(user)) throw new HttpError(403, 'Accès réservé aux administrateurs');
  return user;
};

const backupDir = () =>
  process.env.BACKUP_DIR ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backups');

const logSecurity = (event, req, trustProxy, userId = null) =>
  db
    .prepare('INSERT INTO security_log (user_id, event, ip) VALUES (?, ?, ?)')
    .run(userId, event, clientIp(req, trustProxy));

// ---------- Verrouillage après échecs de connexion ----------
const lockKey = (mail) => `login:${mail}`;
const checkLock = (mail) => {
  const row = db
    .prepare('SELECT locked_until FROM login_attempts WHERE key = ?')
    .get(lockKey(mail));
  const remaining = row ? Math.ceil((row.locked_until - Date.now()) / 1000) : 0;
  if (remaining > 0)
    throw new HttpError(
      429,
      `Trop de tentatives. Réessayez dans ${Math.ceil(remaining / 60)} min.`,
    );
};
const recordFailure = (mail) => {
  const row = db.prepare('SELECT failures FROM login_attempts WHERE key = ?').get(lockKey(mail));
  const failures = (row?.failures || 0) + 1;
  const locked = failures >= LOGIN_MAX_FAILURES;
  db.prepare(
    `INSERT INTO login_attempts (key, failures, locked_until) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`,
  ).run(lockKey(mail), locked ? 0 : failures, locked ? Date.now() + LOGIN_LOCK_MS : 0);
};
const clearFailures = (mail) =>
  db.prepare('DELETE FROM login_attempts WHERE key = ?').run(lockKey(mail));

// ---------- Représentation renvoyée au navigateur ----------
const levelFor = (points) => Math.max(1, Math.floor(points / 200) + 1);

const certificateDto = (c, user) => ({
  id: `cert-${c.id}`,
  courseId: c.course_id,
  courseTitle: c.course_title,
  recipientName: user.name,
  recipientEmail: user.email,
  issuedDate: new Date(c.issued_at + 'Z').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  score: c.score,
  certificateNumber: c.certificate_number,
  verificationHash: c.verification_hash,
  issuer: c.imported
    ? 'CyberSens Academy • importé (non vérifié par examen serveur)'
    : 'CyberSens Academy • Formateur en Cybersécurité & IA : VDPHACKER',
});

const snapshot = (user) => {
  const progress = {};
  for (const r of db
    .prepare(
      'SELECT course_id, lesson_id FROM lesson_progress WHERE user_id = ? ORDER BY completed_at',
    )
    .all(user.id)) {
    (progress[r.course_id] ||= []).push(r.lesson_id);
  }
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      avatar: user.avatar,
      points: user.points,
      level: levelFor(user.points),
      createdAt: user.created_at.slice(0, 10),
      migrated: !!user.migrated_at,
      isAdmin: isAdmin(user),
      communityPosts: db.prepare('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?').get(user.id)
        .n,
      settings: JSON.parse(user.settings || '{}'),
    },
    progress,
    certificates: db
      .prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC')
      .all(user.id)
      .map((c) => certificateDto(c, user)),
    quizHistory: db
      .prepare('SELECT * FROM quiz_results WHERE user_id = ? ORDER BY played_at DESC LIMIT 50')
      .all(user.id)
      .map((q) => ({
        date: new Date(q.played_at + 'Z').toISOString(),
        score: q.score,
        total: q.total,
        mode: q.mode,
        difficulty: q.difficulty || undefined,
      })),
  };
};

const addPoints = (userId, delta) => {
  db.prepare('UPDATE users SET points = MAX(0, points + ?) WHERE id = ?').run(delta, userId);
  return db.prepare('SELECT points FROM users WHERE id = ?').get(userId).points;
};

const signCertificate = (number, userId, courseId, score, issuedAt) =>
  crypto
    .createHmac('sha256', getServerSecret())
    .update(`${number}|${userId}|${courseId}|${score}|${issuedAt}`)
    .digest('hex');

const issueCertificate = (user, course, score, imported = false) => {
  const issuedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const number = `CS-${new Date().getFullYear()}-${course.id.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const hash = signCertificate(number, user.id, course.id, score, issuedAt);
  db.prepare(
    `INSERT INTO certificates (user_id, course_id, course_title, score, certificate_number, verification_hash, imported, issued_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, course_id) DO UPDATE SET
                score = excluded.score, certificate_number = excluded.certificate_number,
                verification_hash = excluded.verification_hash, imported = excluded.imported,
                issued_at = excluded.issued_at, course_title = excluded.course_title`,
  ).run(user.id, course.id, course.title, score, number, hash, imported ? 1 : 0, issuedAt);
  return db
    .prepare('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?')
    .get(user.id, course.id);
};

// ---------- Routes ----------
const STARTED_AT = Date.now();

const routes = {
  // Santé du service (utilisé par le HEALTHCHECK Docker et la supervision) : aucune donnée sensible
  'GET /api/health': async ({ res }) => {
    let database = 'ok';
    try {
      db.prepare('SELECT 1').get();
    } catch {
      database = 'error';
    }
    send(res, database === 'ok' ? 200 : 503, {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    });
  },

  'POST /api/auth/register': async ({ req, res, body, ip, trustProxy }) => {
    rateLimit(`register:${ip}`, 10, 60 * 60_000);
    const name = str(body.name, { min: 2, max: 60, field: 'Nom' });
    const mail = email(body.email);
    const plain = password(body.password, { name, mail });
    const role = ROLES.has(body.role) ? body.role : 'Étudiant';

    const hash = await hashPassword(plain);
    let userId;
    try {
      userId = Number(
        db
          .prepare(
            'INSERT INTO users (email, name, role, title, password_hash) VALUES (?, ?, ?, ?, ?)',
          )
          .run(mail, name, role, `${role} certifié`, hash).lastInsertRowid,
      );
    } catch (err) {
      if (String(err.message).includes('UNIQUE'))
        throw new HttpError(409, 'Un compte existe déjà avec cet e-mail. Connectez-vous.');
      throw err;
    }
    logSecurity('register', req, trustProxy, userId);
    createSession(res, req, userId, trustProxy);
    send(res, 201, snapshot(db.prepare('SELECT * FROM users WHERE id = ?').get(userId)));
  },

  'POST /api/auth/login': async ({ req, res, body, ip, trustProxy }) => {
    rateLimit(`login:${ip}`, 20, 60_000);
    const mail = email(body.email);
    if (typeof body.password !== 'string' || body.password.length > 128)
      throw new HttpError(400, 'Mot de passe invalide');
    checkLock(mail);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(mail);
    const ok = await verifyPassword(
      body.password,
      user ? user.password_hash : await getDummyHash(),
    );
    if (!user || !ok) {
      recordFailure(mail);
      logSecurity(`login_failed:${mail}`, req, trustProxy, user?.id ?? null);
      throw new HttpError(401, 'E-mail ou mot de passe incorrect.');
    }
    clearFailures(mail);
    logSecurity('login', req, trustProxy, user.id);
    createSession(res, req, user.id, trustProxy);
    send(res, 200, snapshot(user));
  },

  // Fonctions d'authentification disponibles (le navigateur masque ce qui n'est pas configuré)
  'GET /api/auth/config': async ({ res }) =>
    send(res, 200, {
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
      passwordReset: mailConfigured(),
    }),

  // « Se connecter avec Google » : le jeton est vérifié côté serveur (signature, audience, e-mail validé)
  'POST /api/auth/google': async ({ req, res, body, ip, trustProxy }) => {
    rateLimit(`google:${ip}`, 20, 60_000);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new HttpError(501, 'La connexion Google n’est pas activée sur ce site.');
    const identity = await verifyGoogleIdToken(body.credential, { clientId });

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(identity.email);
    let created = false;
    if (!user) {
      const role = ROLES.has(body.role) ? body.role : 'Étudiant';
      const name = (identity.name || identity.email.split('@')[0]).slice(0, 60).padEnd(2, ' ');
      // Mot de passe aléatoire : le compte reste protégé, l'utilisateur pourra en définir un via « mot de passe oublié »
      const hash = await hashPassword(crypto.randomBytes(32).toString('base64url'));
      const id = Number(
        db
          .prepare(
            'INSERT INTO users (email, name, role, title, password_hash) VALUES (?, ?, ?, ?, ?)',
          )
          .run(identity.email, name.trim(), role, `${role} certifié`, hash).lastInsertRowid,
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      created = true;
    }
    logSecurity(created ? 'register_google' : 'login_google', req, trustProxy, user.id);
    createSession(res, req, user.id, trustProxy);
    send(res, created ? 201 : 200, snapshot(user));
  },

  // Mot de passe oublié : envoie un lien à usage unique (30 min). Réponse identique que l'e-mail existe ou non.
  'POST /api/auth/forgot': async ({ req, res, body, ip, trustProxy }) => {
    if (!mailConfigured())
      throw new HttpError(
        501,
        'La réinitialisation par e-mail n’est pas activée. Contactez l’administrateur du site.',
      );
    rateLimit(`forgot:${ip}`, 10, 60 * 60_000);
    const mail = email(body.email);
    rateLimit(`forgot-mail:${mail}`, 3, 60 * 60_000);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(mail);
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      transaction(() => {
        db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
        db.prepare(
          'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
        ).run(sha256(token), user.id, new Date(Date.now() + RESET_TTL_MS).toISOString());
      });
      const lang = ['fr', 'en', 'es'].includes(body.lang) ? body.lang : 'fr';
      const link = `${publicUrl()}/?reset=${token}`;
      try {
        await sendMail({ to: user.email, ...resetMessage(lang, link) });
        logSecurity('password_reset_requested', req, trustProxy, user.id);
      } catch (err) {
        console.error('[api] Envoi de l’e-mail de réinitialisation impossible :', err.message);
      }
    }
    send(res, 200, { ok: true });
  },

  'POST /api/auth/reset': async ({ req, res, body, ip, trustProxy }) => {
    rateLimit(`reset:${ip}`, 10, 60 * 60_000);
    if (typeof body.token !== 'string' || body.token.length > 100)
      throw new HttpError(400, 'Lien invalide ou expiré.');
    const row = db
      .prepare(
        `SELECT r.token_hash, u.* FROM password_resets r JOIN users u ON u.id = r.user_id
         WHERE r.token_hash = ? AND r.expires_at > ?`,
      )
      .get(sha256(body.token), new Date().toISOString());
    if (!row) throw new HttpError(400, 'Lien invalide ou expiré. Refaites une demande.');
    const next = password(body.password, { name: row.name, mail: row.email });
    const hash = await hashPassword(next);
    transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.id);
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(row.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    });
    clearFailures(row.email);
    logSecurity('password_reset_done', req, trustProxy, row.id);
    send(res, 200, { ok: true });
  },

  // ---------- Quiz multijoueur (salles) ----------
  'POST /api/rooms': async ({ res, req, body }) => {
    const user = requireUser(req);
    rateLimit(`room-create:${user.id}`, 10, 10 * 60_000);
    const room = createRoom(
      { id: user.id, displayName: publicName(user.name) },
      { count: body.count, seconds: body.seconds },
    );
    send(res, 201, room);
  },

  'POST /api/rooms/join': async ({ res, req, body }) => {
    const user = requireUser(req);
    rateLimit(`room-join:${user.id}`, 30, 60_000);
    send(res, 200, joinRoom({ id: user.id, displayName: publicName(user.name) }, body.code));
  },

  'POST /api/rooms/start': async ({ res, req, body }) => {
    const user = requireUser(req);
    rateLimit(`room-start:${user.id}`, 20, 60_000);
    startRoom(user, body.code);
    send(res, 200, { ok: true });
  },

  'POST /api/rooms/answer': async ({ res, req, body }) => {
    const user = requireUser(req);
    rateLimit(`room-answer:${user.id}`, 120, 60_000);
    answerRoom(user, body.code, body.choice);
    send(res, 200, { ok: true });
  },

  'POST /api/rooms/leave': async ({ res, req }) => {
    leaveRoom(requireUser(req).id);
    send(res, 200, { ok: true });
  },

  // Flux temps réel (Server-Sent Events) : état de la salle poussé à chaque changement
  'GET /api/rooms/stream': async ({ req, res, url }) => {
    const user = requireUser(req);
    rateLimit(`room-stream:${user.id}`, 60, 60_000);
    openStream(req, res, user, url.searchParams.get('code'));
  },

  'POST /api/auth/logout': async ({ req, res }) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    clearSessionCookie(res);
    send(res, 200, { ok: true });
  },

  'GET /api/me': async ({ req, res }) => send(res, 200, snapshot(requireUser(req))),

  'PATCH /api/me': async ({ req, res, body }) => {
    const user = requireUser(req);
    const name = 'name' in body ? str(body.name, { min: 2, max: 60, field: 'Nom' }) : user.name;
    const title = 'title' in body ? str(body.title, { max: 80, field: 'Titre' }) : user.title;
    const pic = 'avatar' in body ? avatar(body.avatar) : user.avatar;
    const merged =
      'settings' in body
        ? { ...JSON.parse(user.settings || '{}'), ...settings(body.settings) }
        : JSON.parse(user.settings || '{}');
    db.prepare('UPDATE users SET name = ?, title = ?, avatar = ?, settings = ? WHERE id = ?').run(
      name,
      title,
      pic,
      JSON.stringify(merged),
      user.id,
    );
    send(res, 200, { ok: true });
  },

  // Changement de mot de passe : exige l'ancien, ferme les autres sessions (appareils perdus ou volés)
  'POST /api/me/password': async ({ req, res, body, trustProxy }) => {
    const user = requireUser(req);
    rateLimit(`pwchange:${user.id}`, 5, 15 * 60_000);
    if (typeof body.current !== 'string' || body.current.length > 128)
      throw new HttpError(400, 'Mot de passe actuel invalide');
    if (!(await verifyPassword(body.current, user.password_hash))) {
      logSecurity('password_change_failed', req, trustProxy, user.id);
      throw new HttpError(403, 'Le mot de passe actuel est incorrect.');
    }
    const next = password(body.next, { name: user.name, mail: user.email });
    if (next === body.current)
      throw new HttpError(400, 'Le nouveau mot de passe doit être différent de l’ancien.');
    const hash = await hashPassword(next);
    const current = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(
        user.id,
        sha256(current || ''),
      );
    });
    clearFailures(user.email);
    logSecurity('password_changed', req, trustProxy, user.id);
    send(res, 200, { ok: true });
  },

  'POST /api/me/points': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`points:${user.id}`, 120, 60_000);
    const delta = int(body.delta, 1, 200, 'Points');
    // Le navigateur déclare ses points : le serveur en plafonne le total quotidien pour que le classement reste fiable
    const day = new Date().toISOString().slice(0, 10);
    const used =
      db.prepare('SELECT total FROM points_daily WHERE user_id = ? AND day = ?').get(user.id, day)
        ?.total ?? 0;
    const granted = Math.max(0, Math.min(delta, DAILY_POINTS_CAP - used));
    if (granted > 0)
      db.prepare(
        `INSERT INTO points_daily (user_id, day, total) VALUES (?, ?, ?)
         ON CONFLICT(user_id, day) DO UPDATE SET total = total + excluded.total`,
      ).run(user.id, day, granted);
    send(res, 200, { points: addPoints(user.id, granted), granted });
  },

  'POST /api/progress': async ({ req, res, body }) => {
    const user = requireUser(req);
    const courseId = str(body.courseId, { max: 40, field: 'Cours' });
    const lessonId = str(body.lessonId, { max: 40, field: 'Leçon' });
    if (!isValidLesson(courseId, lessonId)) throw new HttpError(404, 'Leçon inconnue');
    const r = db
      .prepare(
        'INSERT OR IGNORE INTO lesson_progress (user_id, course_id, lesson_id) VALUES (?, ?, ?)',
      )
      .run(user.id, courseId, lessonId);
    send(res, 200, { newlyCompleted: r.changes > 0 });
  },

  'POST /api/quiz-results': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`quiz:${user.id}`, 30, 60_000);
    const total = int(body.total, 1, 100, 'Total');
    const score = int(body.score, 0, total, 'Score');
    const mode = QUIZ_MODES.has(body.mode) ? body.mode : 'Solo';
    const difficulty =
      body.difficulty == null ? null : str(body.difficulty, { max: 20, field: 'Difficulté' });
    db.prepare(
      'INSERT INTO quiz_results (user_id, score, total, mode, difficulty) VALUES (?, ?, ?, ?, ?)',
    ).run(user.id, score, total, mode, difficulty);
    send(res, 201, { ok: true });
  },

  'DELETE /api/quiz-results': async ({ req, res }) => {
    const user = requireUser(req);
    db.prepare('DELETE FROM quiz_results WHERE user_id = ?').run(user.id);
    send(res, 200, { ok: true });
  },

  // Correction de l'examen côté serveur : seul le serveur délivre (et signe) les certificats
  'POST /api/exams': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`exam:${user.id}`, 20, 60 * 60_000);
    const course = getCourse(typeof body.courseId === 'string' ? body.courseId : '');
    if (!course) throw new HttpError(404, 'Module inconnu');
    if (!body.answers || typeof body.answers !== 'object')
      throw new HttpError(400, 'Réponses invalides');
    const result = gradeExam(course.id, body.answers);
    if (!result) throw new HttpError(404, 'Ce module n’a pas d’examen');

    let certificate = null;
    let points = user.points;
    if (result.passed) {
      const firstTime = !db
        .prepare('SELECT 1 FROM certificates WHERE user_id = ? AND course_id = ? AND imported = 0')
        .get(user.id, course.id);
      transaction(() => {
        certificate = certificateDto(issueCertificate(user, course, result.score), user);
        if (firstTime) points = addPoints(user.id, 150);
      });
    }
    send(res, 200, { ...result, certificate, points });
  },

  // Import unique des données locales (navigateur) lors de la première connexion
  'POST /api/migrate': async ({ req, res, body }) => {
    const user = requireUser(req);
    if (user.migrated_at) return send(res, 200, snapshot(user));

    transaction(() => {
      const progress = body.progress && typeof body.progress === 'object' ? body.progress : {};
      const insertLesson = db.prepare(
        'INSERT OR IGNORE INTO lesson_progress (user_id, course_id, lesson_id) VALUES (?, ?, ?)',
      );
      for (const [courseId, lessons] of Object.entries(progress)) {
        if (!Array.isArray(lessons)) continue;
        for (const lessonId of lessons.slice(0, 100)) {
          if (typeof lessonId === 'string' && isValidLesson(courseId, lessonId))
            insertLesson.run(user.id, courseId, lessonId);
        }
      }

      const insertQuiz = db.prepare(
        'INSERT INTO quiz_results (user_id, score, total, mode, difficulty, played_at) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const q of Array.isArray(body.quizHistory) ? body.quizHistory.slice(0, 50) : []) {
        if (
          !Number.isInteger(q?.total) ||
          q.total < 1 ||
          q.total > 100 ||
          !Number.isInteger(q?.score) ||
          q.score < 0 ||
          q.score > q.total
        )
          continue;
        const date = new Date(q.date);
        insertQuiz.run(
          user.id,
          q.score,
          q.total,
          QUIZ_MODES.has(q.mode) ? q.mode : 'Solo',
          typeof q.difficulty === 'string' ? q.difficulty.slice(0, 20) : null,
          (isNaN(date.getTime()) ? new Date() : date).toISOString().slice(0, 19).replace('T', ' '),
        );
      }

      // Les certificats locaux n'ont jamais été vérifiés par le serveur : ils sont marqués « importés »
      for (const c of Array.isArray(body.certificates) ? body.certificates.slice(0, 20) : []) {
        const course = getCourse(c?.courseId);
        if (
          course &&
          Number.isInteger(c.score) &&
          c.score >= 0 &&
          c.score <= 100 &&
          !db
            .prepare('SELECT 1 FROM certificates WHERE user_id = ? AND course_id = ?')
            .get(user.id, course.id)
        ) {
          issueCertificate(user, course, c.score, true);
        }
      }

      const points = Number.isInteger(body.points) ? Math.min(Math.max(body.points, 0), 5000) : 0;
      if (points > 0) addPoints(user.id, points);
      if (body.settings) {
        db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(
          JSON.stringify({ ...JSON.parse(user.settings || '{}'), ...settings(body.settings) }),
          user.id,
        );
      }
      db.prepare("UPDATE users SET migrated_at = datetime('now') WHERE id = ?").run(user.id);
    });
    send(res, 200, snapshot(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)));
  },

  // Vérification publique d'un certificat (données minimales)
  'GET /api/certificates/verify': async ({ res, url, ip }) => {
    rateLimit(`verify:${ip}`, 60, 60_000);
    const number = String(url.searchParams.get('number') || '').slice(0, 80);
    const c = db
      .prepare(
        `SELECT c.*, u.name FROM certificates c JOIN users u ON u.id = c.user_id WHERE c.certificate_number = ?`,
      )
      .get(number);
    if (!c) return send(res, 404, { valid: false });
    const valid = crypto.timingSafeEqual(
      Buffer.from(
        signCertificate(c.certificate_number, c.user_id, c.course_id, c.score, c.issued_at),
        'hex',
      ),
      Buffer.from(c.verification_hash, 'hex'),
    );
    send(res, 200, {
      valid,
      imported: !!c.imported,
      recipientName: c.name,
      courseTitle: c.course_title,
      score: c.score,
      issuedAt: c.issued_at.slice(0, 10),
    });
  },

  // Actualités cyber agrégées depuis des flux RSS externes (public, mis en cache)
  'GET /api/news': async ({ res, ip }) => {
    rateLimit(`news:${ip}`, 60, 60_000);
    send(res, 200, await getNews(), { 'Cache-Control': 'public, max-age=60' });
  },

  // Classement général : membres visibles (option désactivable dans les réglages), triés par points
  'GET /api/leaderboard': async ({ req, res }) => {
    const user = requireUser(req);
    rateLimit(`leaderboard:${user.id}`, 60, 60_000);
    const visible = "COALESCE(json_extract(u.settings, '$.showInLeaderboard'), 1) != 0";
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.title, u.points,
                (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) AS certificates
         FROM users u WHERE u.points > 0 AND ${visible}
         ORDER BY u.points DESC, u.id ASC LIMIT 50`,
      )
      .all();
    const myVisible =
      db.prepare(`SELECT 1 FROM users u WHERE u.id = ? AND ${visible}`).get(user.id) !== undefined;
    const myRank =
      myVisible && user.points > 0
        ? db
            .prepare(`SELECT COUNT(*) + 1 AS rank FROM users u WHERE u.points > ? AND ${visible}`)
            .get(user.points).rank
        : null;
    send(res, 200, {
      entries: rows.map((r, i) => ({
        rank: i + 1,
        name: publicName(r.name),
        title: r.title || '',
        level: levelFor(r.points),
        points: r.points,
        certificates: r.certificates,
        isMe: r.id === user.id,
      })),
      me: { rank: myRank, points: user.points, level: levelFor(user.points), visible: myVisible },
    });
  },

  // Communauté : fil de messages (texte brut), commentaires et « j'aime »
  'GET /api/community/posts': async ({ req, res, url }) => {
    const user = requireUser(req);
    rateLimit(`community-read:${user.id}`, 120, 60_000);
    const topic = url.searchParams.get('topic');
    const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
    if (topic && !TOPICS.has(topic)) throw new HttpError(400, 'Sujet invalide');
    const posts = db
      .prepare(
        `SELECT p.id, p.user_id, p.topic, p.body, p.created_at, u.name, u.title, u.points,
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likes,
                EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked,
                EXISTS(SELECT 1 FROM post_reports r WHERE r.post_id = p.id AND r.user_id = ?) AS reported,
                (SELECT COUNT(*) FROM post_reports r WHERE r.post_id = p.id) AS reports
         FROM posts p JOIN users u ON u.id = p.user_id
         WHERE p.id < ? AND (? IS NULL OR p.topic = ?)
         ORDER BY p.id DESC LIMIT 20`,
      )
      .all(user.id, user.id, before, topic, topic);
    const ids = posts.map((p) => p.id);
    const comments = ids.length
      ? db
          .prepare(
            `SELECT c.id, c.post_id, c.user_id, c.body, c.created_at, u.name
             FROM post_comments c JOIN users u ON u.id = c.user_id
             WHERE c.post_id IN (${ids.map(() => '?').join(',')}) ORDER BY c.id`,
          )
          .all(...ids)
      : [];
    send(res, 200, {
      canModerate: isAdmin(user),
      posts: posts.map((p) => ({
        id: p.id,
        topic: p.topic,
        body: p.body,
        createdAt: p.created_at.replace(' ', 'T') + 'Z',
        author: publicName(p.name),
        authorTitle: p.title || '',
        authorLevel: levelFor(p.points),
        likes: p.likes,
        liked: !!p.liked,
        reportedByMe: !!p.reported,
        // Le nombre de signalements n'est visible que des modérateurs
        reports: isAdmin(user) ? p.reports : undefined,
        mine: p.user_id === user.id,
        comments: comments
          .filter((c) => c.post_id === p.id)
          .map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.created_at.replace(' ', 'T') + 'Z',
            author: publicName(c.name),
            mine: c.user_id === user.id,
          })),
      })),
    });
  },

  'POST /api/community/posts': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`community-post:${user.id}`, 5, 10 * 60_000);
    const topic = TOPICS.has(body.topic) ? body.topic : 'general';
    const text = longText(body.body, { min: 3, max: 1000 });
    const id = Number(
      db
        .prepare('INSERT INTO posts (user_id, topic, body) VALUES (?, ?, ?)')
        .run(user.id, topic, text).lastInsertRowid,
    );
    send(res, 201, { id });
  },

  'POST /api/community/comments': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`community-comment:${user.id}`, 20, 10 * 60_000);
    const postId = int(body.postId, 1, Number.MAX_SAFE_INTEGER, 'Message');
    if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId))
      throw new HttpError(404, 'Message introuvable');
    const text = longText(body.body, { min: 1, max: 500, field: 'Commentaire' });
    const id = Number(
      db
        .prepare('INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)')
        .run(postId, user.id, text).lastInsertRowid,
    );
    send(res, 201, { id });
  },

  'POST /api/community/like': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`community-like:${user.id}`, 60, 60_000);
    const postId = int(body.postId, 1, Number.MAX_SAFE_INTEGER, 'Message');
    if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId))
      throw new HttpError(404, 'Message introuvable');
    const removed = db
      .prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?')
      .run(postId, user.id).changes;
    if (!removed)
      db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(postId, user.id);
    const likes = db
      .prepare('SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?')
      .get(postId).n;
    send(res, 200, { liked: !removed, likes });
  },

  // Signalement d'un message (modération) : un par membre et par message, pas sur ses propres messages
  'POST /api/community/report': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`community-report:${user.id}`, 10, 10 * 60_000);
    const postId = int(body.postId, 1, Number.MAX_SAFE_INTEGER, 'Message');
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
    if (!post) throw new HttpError(404, 'Message introuvable');
    if (post.user_id === user.id)
      throw new HttpError(400, 'Vous ne pouvez pas signaler votre propre message.');
    db.prepare('INSERT OR IGNORE INTO post_reports (post_id, user_id) VALUES (?, ?)').run(
      postId,
      user.id,
    );
    send(res, 200, { reported: true });
  },

  // Suppression : auteur du message ou administrateur
  'DELETE /api/community/posts': async ({ req, res, url }) => {
    const user = requireUser(req);
    const id = int(Number(url.searchParams.get('id')), 1, Number.MAX_SAFE_INTEGER, 'Message');
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);
    if (!post) throw new HttpError(404, 'Message introuvable');
    if (post.user_id !== user.id && !isAdmin(user))
      throw new HttpError(403, 'Action non autorisée');
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    send(res, 200, { ok: true });
  },

  'DELETE /api/community/comments': async ({ req, res, url }) => {
    const user = requireUser(req);
    const id = int(Number(url.searchParams.get('id')), 1, Number.MAX_SAFE_INTEGER, 'Commentaire');
    const c = db.prepare('SELECT user_id FROM post_comments WHERE id = ?').get(id);
    if (!c) throw new HttpError(404, 'Commentaire introuvable');
    if (c.user_id !== user.id && !isAdmin(user)) throw new HttpError(403, 'Action non autorisée');
    db.prepare('DELETE FROM post_comments WHERE id = ?').run(id);
    send(res, 200, { ok: true });
  },

  // Administration (DevOps) : réservée aux comptes listés dans ADMIN_EMAILS
  'GET /api/devops/status': async ({ req, res }) => {
    requireAdmin(req);
    const mem = process.memoryUsage();
    const count = (table) => db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get().cnt;
    send(res, 200, {
      status: 'healthy',
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      },
      stats: {
        users: count('users'),
        certificates: count('certificates'),
        activeSessions: count('sessions'),
      },
      timestamp: new Date().toISOString(),
    });
  },

  'POST /api/devops/backup': async ({ req, res }) => {
    const admin = requireAdmin(req);
    rateLimit(`backup:${admin.id}`, 5, 10 * 60_000);
    const name = `cybersens-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
    backupTo(path.join(backupDir(), name));
    send(res, 200, { success: true, message: `Sauvegarde ${name} créée sur le serveur.` });
  },

  'POST /api/devops/exec': async ({ req, res, body }) => {
    const admin = requireAdmin(req);
    rateLimit(`devops-exec:${admin.id}`, 10, 10 * 60_000);
    const action = body.action;
    if (action === 'clear_sessions') {
      const info = db
        .prepare('DELETE FROM sessions WHERE expires_at < ?')
        .run(new Date().toISOString());
      return send(res, 200, {
        success: true,
        message: `${info.changes} sessions expirées purgées.`,
      });
    }
    if (action === 'vacuum') {
      db.prepare('VACUUM').run();
      return send(res, 200, {
        success: true,
        message: 'Base de données optimisée (VACUUM exécuté).',
      });
    }
    send(res, 400, { error: 'Action DevOps inconnue' });
  },
};

/**
 * Traite une requête /api/* (hors relais Gemini). Retourne false si l'URL n'est pas une route de l'API.
 */
export const handleApi = async (req, res, { trustProxy = false } = {}) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/gemini/')) return false;

  const handler = routes[`${req.method} ${url.pathname}`];
  try {
    if (!handler) throw new HttpError(404, 'Route inconnue');
    const mutating = req.method !== 'GET' && req.method !== 'HEAD';
    if (mutating) checkOrigin(req, { trustProxy });
    const body =
      mutating && req.method !== 'DELETE' && url.pathname !== '/api/auth/logout'
        ? await readJson(req)
        : {};
    await handler({ req, res, body, url, ip: clientIp(req, trustProxy), trustProxy });
  } catch (err) {
    if (err instanceof HttpError) {
      send(
        res,
        err.status,
        { error: err.message },
        err.status === 413 ? { Connection: 'close' } : {},
      );
    } else {
      console.error('[api] Erreur interne :', err);
      if (!res.headersSent) send(res, 500, { error: 'Erreur interne du serveur' });
    }
  }
  return true;
};

// Nettoyage périodique des sessions expirées
setInterval(
  () => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString()),
  3_600_000,
).unref();
