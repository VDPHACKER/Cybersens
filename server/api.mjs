// API JSON de CyberSens : comptes, sessions, progression, certificats, quiz.
// Monté sous /api par server/index.mjs (production) et par vite.config.ts (développement).
import crypto from 'node:crypto';
import { db, transaction, getServerSecret, exportAll } from './db.mjs';
import { getCourse, isValidLesson, gradeExam } from './courses.mjs';
import { HttpError } from './httpError.mjs';
import { checkOrigin } from './csrf.mjs';
import { hashPassword, verifyPassword } from './passwords.mjs';
import { getNews } from './news.mjs';
import { openLiveStream, publish } from './liveFeed.mjs';
import {
  announcementPush,
  communityPostPush,
  countSubscriptions,
  getPublicKey,
  pushInBackground,
  removeSubscription,
  saveSubscription,
} from './push.mjs';
import {
  answerRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  openStream,
  restartRoom,
  startRoom,
} from './rooms.mjs';
import {
  askCtfSandbox,
  createCtfRoom,
  finishCtfRoom,
  joinCtfRoom,
  leaveCtfRoom,
  openCtfStream,
  restartCtfRoom,
  startCtfRoom,
  submitCtfFlag,
} from './ctfRooms.mjs';
import { verifyGoogleIdToken } from './google.mjs';
import { mailConfigured, publicUrl, sendMail } from './mail.mjs';
import { resetUserPassword } from './accountTools.mjs';
import { clientIp } from './clientIp.mjs';

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
// Inscriptions par adresse IP et par heure (une classe ou une entreprise s'inscrit souvent depuis le même réseau)
const REGISTER_PER_HOUR = 30;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60_000;
const ROLES = new Set(['Particulier', 'Étudiant', 'Professionnel', 'Entreprise']);
// Version des conditions d'utilisation : à changer (avec la date de features/Legal/termsContent.ts) à chaque révision du texte.
export const TERMS_VERSION = '2026-09-30';
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

/** Réservé aux tests : remet à zéro les limites de débit dont la clé commence par ce préfixe. */
export const resetRateLimits = (prefix) => {
  for (const key of buckets.keys()) if (key.startsWith(prefix)) buckets.delete(key);
};

// Nombre total de comptes affiché sur l'accueil public (mis en cache 5 min)
const MEMBERS_TTL_MS = 5 * 60_000;
let membersCache = { at: 0, value: 0 };
const memberCount = async () => {
  if (Date.now() - membersCache.at > MEMBERS_TTL_MS) {
    const row = await db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
    membersCache = { at: Date.now(), value: Number(row.cnt) };
  }
  return membersCache.value;
};

/** Réservé aux tests : oublie le nombre de membres en cache. */
export const resetMembersCache = () => {
  membersCache = { at: 0, value: 0 };
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

const createSession = async (res, req, userId, trustProxy) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, expires.toISOString());
  const secure = isHttps(req, trustProxy) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure}`,
  );
};

const clearSessionCookie = (res) =>
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);

/** Utilisateur connecté (ou null) à partir du cookie de session. */
export const getSessionUser = async (req) => {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token || token.length > 100) return null;
  const row = await db
    .prepare(
      `
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString());
  return row || null;
};

const requireUser = async (req) => {
  const user = await getSessionUser(req);
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

// Mot de passe administrateur : second verrou, distinct du mot de passe du compte.
// Stocké haché (scrypt) dans la table meta, défini depuis le Centre DevOps (bouton « Définir » la première
// fois) — jamais dans une variable d'environnement, pour éviter les soucis de copier-coller côté hébergeur.
// ADMIN_PASSWORD_HASH reste accepté en complément (prioritaire) pour qui préfère le configurer par variable
// d'environnement (format npm run admin:hash-password) ; la plupart des sites n'en ont pas besoin.
const ADMIN_UNLOCK_MS = 30 * 60_000;
const ADMIN_HASH_FORMAT = /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/;
const ADMIN_HASH_META_KEY = 'admin_password_hash';

const envAdminHash = () =>
  (process.env.ADMIN_PASSWORD_HASH || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(
      /^scrypt:(\d+):(\d+):(\d+):([0-9a-f]+):([0-9a-f]+)$/,
      (_, ...p) => 'scrypt$' + p.slice(0, 5).join('$'),
    );

const storedAdminHash = async () =>
  (await db.prepare('SELECT value FROM meta WHERE key = ?').get(ADMIN_HASH_META_KEY))?.value || '';

/** L'empreinte active : la variable d'environnement si valide, sinon celle définie depuis le site. */
const getAdminHash = async () => {
  const env = envAdminHash();
  return ADMIN_HASH_FORMAT.test(env) ? env : await storedAdminHash();
};

const adminPasswordConfigured = async () => ADMIN_HASH_FORMAT.test(await getAdminHash());

const sessionToken = (req) => parseCookies(req.headers.cookie)[SESSION_COOKIE] || '';

/** Administrateur connecté (compte listé dans ADMIN_EMAILS), sans exiger que le mot de passe soit déjà défini :
 * utilisé par l'écran d'état et de première configuration. */
const requireAdminAccount = async (req) => {
  if (adminEmails().length === 0) throw new HttpError(404, 'Route inconnue');
  const user = await requireUser(req);
  if (!isAdmin(user)) throw new HttpError(403, 'Accès réservé aux administrateurs');
  return user;
};

const isUnlocked = async (req) => {
  const row = await db
    .prepare('SELECT admin_unlocked_until FROM sessions WHERE token_hash = ?')
    .get(sha256(sessionToken(req)));
  return Boolean(row?.admin_unlocked_until && row.admin_unlocked_until > new Date().toISOString());
};

const unlockSession = (req) =>
  db
    .prepare('UPDATE sessions SET admin_unlocked_until = ? WHERE token_hash = ?')
    .run(new Date(Date.now() + ADMIN_UNLOCK_MS).toISOString(), sha256(sessionToken(req)));

/** Routes d'administration : compte administrateur ET mot de passe administrateur défini et saisi. */
const requireAdmin = async (req) => {
  const user = await requireAdminAccount(req);
  if (!(await adminPasswordConfigured()))
    throw new HttpError(
      503,
      'Le mot de passe administrateur n’est pas encore défini. Ouvrez le Centre DevOps pour le configurer.',
    );
  if (!(await isUnlocked(req))) throw new HttpError(423, 'Mot de passe administrateur requis.');
  return user;
};

// Format texte « YYYY-MM-DD HH:MM:SS » (UTC), identique au défaut des colonnes de date de la base
const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const logSecurity = (event, req, trustProxy, userId = null) =>
  db
    .prepare('INSERT INTO security_log (user_id, event, ip) VALUES (?, ?, ?)')
    .run(userId, event, clientIp(req, trustProxy));

// ---------- Verrouillage après échecs de connexion ----------
const lockKey = (mail) => `login:${mail}`;
const checkLock = async (mail) => {
  const row = await db
    .prepare('SELECT locked_until FROM login_attempts WHERE key = ?')
    .get(lockKey(mail));
  const remaining = row ? Math.ceil((row.locked_until - Date.now()) / 1000) : 0;
  if (remaining > 0)
    throw new HttpError(
      429,
      `Trop de tentatives. Réessayez dans ${Math.ceil(remaining / 60)} min.`,
    );
};
const recordFailure = async (mail) => {
  const row = await db
    .prepare('SELECT failures FROM login_attempts WHERE key = ?')
    .get(lockKey(mail));
  const failures = (row?.failures || 0) + 1;
  const locked = failures >= LOGIN_MAX_FAILURES;
  await db
    .prepare(
      `INSERT INTO login_attempts (key, failures, locked_until) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`,
    )
    .run(lockKey(mail), locked ? 0 : failures, locked ? Date.now() + LOGIN_LOCK_MS : 0);
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

const snapshot = async (user) => {
  const progress = {};
  for (const r of await db
    .prepare(
      'SELECT course_id, lesson_id FROM lesson_progress WHERE user_id = ? ORDER BY completed_at',
    )
    .all(user.id)) {
    (progress[r.course_id] ||= []).push(r.lesson_id);
  }
  const communityPosts = (
    await db.prepare('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?').get(user.id)
  ).n;
  const certificates = (
    await db
      .prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC')
      .all(user.id)
  ).map((c) => certificateDto(c, user));
  const quizHistory = (
    await db
      .prepare('SELECT * FROM quiz_results WHERE user_id = ? ORDER BY played_at DESC LIMIT 50')
      .all(user.id)
  ).map((q) => ({
    date: new Date(q.played_at + 'Z').toISOString(),
    score: q.score,
    total: q.total,
    mode: q.mode,
    difficulty: q.difficulty || undefined,
  }));
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
      communityPosts,
      settings: JSON.parse(user.settings || '{}'),
    },
    progress,
    certificates,
    quizHistory,
  };
};

const addPoints = async (userId, delta) => {
  await db
    .prepare('UPDATE users SET points = GREATEST(0, points + ?) WHERE id = ?')
    .run(delta, userId);
  return (await db.prepare('SELECT points FROM users WHERE id = ?').get(userId)).points;
};

const signCertificate = async (number, userId, courseId, score, issuedAt) =>
  crypto
    .createHmac('sha256', await getServerSecret())
    .update(`${number}|${userId}|${courseId}|${score}|${issuedAt}`)
    .digest('hex');

const issueCertificate = async (user, course, score, imported = false) => {
  const issuedAt = nowSql();
  const number = `CS-${new Date().getFullYear()}-${course.id.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const hash = await signCertificate(number, user.id, course.id, score, issuedAt);
  await db
    .prepare(
      `INSERT INTO certificates (user_id, course_id, course_title, score, certificate_number, verification_hash, imported, issued_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, course_id) DO UPDATE SET
                score = excluded.score, certificate_number = excluded.certificate_number,
                verification_hash = excluded.verification_hash, imported = excluded.imported,
                issued_at = excluded.issued_at, course_title = excluded.course_title`,
    )
    .run(user.id, course.id, course.title, score, number, hash, imported ? 1 : 0, issuedAt);
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
      await db.prepare('SELECT 1').get();
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
    rateLimit(`register:${ip}`, REGISTER_PER_HOUR, 60 * 60_000);
    const name = str(body.name, { min: 2, max: 60, field: 'Nom' });
    const mail = email(body.email);
    const plain = password(body.password, { name, mail });
    const role = ROLES.has(body.role) ? body.role : 'Étudiant';
    // Consentement explicite obligatoire, sauf recréation d'un ancien compte local (aucune acceptation enregistrée)
    const legacy = body.legacyMigration === true;
    if (!legacy && body.acceptTerms !== true)
      throw new HttpError(
        400,
        'Vous devez accepter les conditions d’utilisation pour vous inscrire.',
      );

    const hash = await hashPassword(plain);
    let created;
    try {
      created = await db
        .prepare(
          `INSERT INTO users (email, name, role, title, password_hash, terms_accepted_at, terms_version)
           VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        )
        .get(
          mail,
          name,
          role,
          `${role} certifié`,
          hash,
          legacy ? null : nowSql(),
          legacy ? null : TERMS_VERSION,
        );
      resetMembersCache(); // le nombre de membres affiché sur l'accueil doit suivre les inscriptions
    } catch (err) {
      if (err.code === '23505')
        throw new HttpError(409, 'Un compte existe déjà avec cet e-mail. Connectez-vous.');
      throw err;
    }
    await logSecurity('register', req, trustProxy, created.id);
    await createSession(res, req, created.id, trustProxy);
    send(res, 201, await snapshot(created));
  },

  'POST /api/auth/login': async ({ req, res, body, ip, trustProxy }) => {
    rateLimit(`login:${ip}`, 20, 60_000);
    const mail = email(body.email);
    if (typeof body.password !== 'string' || body.password.length > 128)
      throw new HttpError(400, 'Mot de passe invalide');
    await checkLock(mail);

    const user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(mail);
    const ok = await verifyPassword(
      body.password,
      user ? user.password_hash : await getDummyHash(),
    );
    if (!user || !ok) {
      await recordFailure(mail);
      await logSecurity(`login_failed:${mail}`, req, trustProxy, user?.id ?? null);
      throw new HttpError(401, 'E-mail ou mot de passe incorrect.');
    }
    await clearFailures(mail);
    await logSecurity('login', req, trustProxy, user.id);
    await createSession(res, req, user.id, trustProxy);
    send(res, 200, await snapshot(user));
  },

  // Fonctions d'authentification disponibles (le navigateur masque ce qui n'est pas configuré)
  'GET /api/auth/config': async ({ res }) =>
    send(res, 200, {
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
      passwordReset: mailConfigured(),
      termsVersion: TERMS_VERSION,
      contactEmail: process.env.CONTACT_EMAIL || null,
    }),

  // « Se connecter avec Google » : le jeton est vérifié côté serveur (signature, audience, e-mail validé)
  'POST /api/auth/google': async ({ req, res, body, ip, trustProxy }) => {
    rateLimit(`google:${ip}`, 20, 60_000);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new HttpError(501, 'La connexion Google n’est pas activée sur ce site.');
    const identity = await verifyGoogleIdToken(body.credential, { clientId });

    const googleMail = identity.email.toLowerCase();
    let user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(googleMail);
    let created = false;
    if (!user) {
      if (body.acceptTerms !== true)
        throw new HttpError(
          400,
          'Nouveau compte : ouvrez l’onglet « Créer un compte », acceptez les conditions d’utilisation, puis utilisez le bouton Google.',
        );
      const role = ROLES.has(body.role) ? body.role : 'Étudiant';
      const name = (identity.name || identity.email.split('@')[0]).slice(0, 60).padEnd(2, ' ');
      // Mot de passe aléatoire : le compte reste protégé, l'utilisateur pourra en définir un via « mot de passe oublié »
      const hash = await hashPassword(crypto.randomBytes(32).toString('base64url'));
      user = await db
        .prepare(
          `INSERT INTO users (email, name, role, title, password_hash, terms_accepted_at, terms_version)
           VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        )
        .get(googleMail, name.trim(), role, `${role} certifié`, hash, nowSql(), TERMS_VERSION);
      resetMembersCache();
      created = true;
    }
    await logSecurity(created ? 'register_google' : 'login_google', req, trustProxy, user.id);
    await createSession(res, req, user.id, trustProxy);
    send(res, created ? 201 : 200, await snapshot(user));
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
    const user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(mail);
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      await transaction(async () => {
        await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
        await db
          .prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
          .run(sha256(token), user.id, new Date(Date.now() + RESET_TTL_MS).toISOString());
      });
      const lang = ['fr', 'en', 'es'].includes(body.lang) ? body.lang : 'fr';
      const link = `${publicUrl()}/?reset=${token}`;
      try {
        await sendMail({ to: user.email, ...resetMessage(lang, link) });
        await logSecurity('password_reset_requested', req, trustProxy, user.id);
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
    const row = await db
      .prepare(
        `SELECT r.token_hash, u.* FROM password_resets r JOIN users u ON u.id = r.user_id
         WHERE r.token_hash = ? AND r.expires_at > ?`,
      )
      .get(sha256(body.token), new Date().toISOString());
    if (!row) throw new HttpError(400, 'Lien invalide ou expiré. Refaites une demande.');
    const next = password(body.password, { name: row.name, mail: row.email });
    const hash = await hashPassword(next);
    await transaction(async () => {
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.id);
      await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(row.id);
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    });
    await clearFailures(row.email.toLowerCase());
    await logSecurity('password_reset_done', req, trustProxy, row.id);
    send(res, 200, { ok: true });
  },

  // ---------- Quiz multijoueur (salles) ----------
  'POST /api/rooms': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`room-create:${user.id}`, 10, 10 * 60_000);
    const room = createRoom(
      { id: user.id, displayName: publicName(user.name) },
      { count: body.count, seconds: body.seconds },
    );
    send(res, 201, room);
  },

  'POST /api/rooms/join': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`room-join:${user.id}`, 30, 60_000);
    send(res, 200, joinRoom({ id: user.id, displayName: publicName(user.name) }, body.code));
  },

  'POST /api/rooms/start': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`room-start:${user.id}`, 20, 60_000);
    startRoom(user, body.code);
    send(res, 200, { ok: true });
  },

  'POST /api/rooms/restart': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`room-restart:${user.id}`, 20, 60_000);
    restartRoom(user, body.code, { count: body.count, seconds: body.seconds });
    send(res, 200, { ok: true });
  },

  'POST /api/rooms/answer': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`room-answer:${user.id}`, 120, 60_000);
    answerRoom(user, body.code, body.choice);
    send(res, 200, { ok: true });
  },

  'POST /api/rooms/leave': async ({ res, req }) => {
    leaveRoom((await requireUser(req)).id);
    send(res, 200, { ok: true });
  },

  // Flux temps réel (Server-Sent Events) : état de la salle poussé à chaque changement
  'GET /api/rooms/stream': async ({ req, res, url }) => {
    const user = await requireUser(req);
    rateLimit(`room-stream:${user.id}`, 60, 60_000);
    openStream(req, res, user, url.searchParams.get('code'));
  },

  // ---------- CTF en équipe (salles) ----------
  'POST /api/ctf/rooms': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-room-create:${user.id}`, 10, 10 * 60_000);
    send(
      res,
      201,
      createCtfRoom(
        { id: user.id, displayName: publicName(user.name) },
        { challengeIds: body.challengeIds, lang: body.lang, durationHours: body.durationHours },
      ),
    );
  },

  'POST /api/ctf/rooms/join': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-room-join:${user.id}`, 30, 60_000);
    send(res, 200, joinCtfRoom({ id: user.id, displayName: publicName(user.name) }, body.code));
  },

  'POST /api/ctf/rooms/start': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-room-start:${user.id}`, 20, 60_000);
    startCtfRoom(user, body.code);
    send(res, 200, { ok: true });
  },

  // Vérification d'un drapeau : le serveur seul connaît les bonnes réponses
  'POST /api/ctf/rooms/submit': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-flag:${user.id}`, 30, 60_000);
    send(res, 200, submitCtfFlag(user, body.code, body.challengeId, body.flag));
  },

  'POST /api/ctf/rooms/sandbox': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-sandbox:${user.id}`, 30, 60_000);
    send(
      res,
      200,
      askCtfSandbox(
        user,
        body.code,
        body.challengeId,
        body.prompt,
        ['fr', 'en', 'es'].includes(body.lang) ? body.lang : 'fr',
      ),
    );
  },

  'POST /api/ctf/rooms/finish': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-room-finish:${user.id}`, 20, 60_000);
    finishCtfRoom(user, body.code);
    send(res, 200, { ok: true });
  },

  'POST /api/ctf/rooms/restart': async ({ res, req, body }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-room-restart:${user.id}`, 10, 10 * 60_000);
    restartCtfRoom(user, body.code, { lang: body.lang });
    send(res, 200, { ok: true });
  },

  'POST /api/ctf/rooms/leave': async ({ res, req }) => {
    leaveCtfRoom((await requireUser(req)).id);
    send(res, 200, { ok: true });
  },

  'GET /api/ctf/rooms/stream': async ({ req, res, url }) => {
    const user = await requireUser(req);
    rateLimit(`ctf-room-stream:${user.id}`, 60, 60_000);
    openCtfStream(req, res, user, url.searchParams.get('code'));
  },

  // Notifications en direct (nouveaux posts de la Communauté, nouvelles actualités)
  'GET /api/live/stream': async ({ req, res }) => {
    const user = await requireUser(req);
    rateLimit(`live-stream:${user.id}`, 30, 60_000);
    openLiveStream(req, res, user);
  },

  // Notifications Web Push (reçues application fermée) : clé publique, abonnement et désabonnement d'un appareil
  'GET /api/push/key': async ({ req, res }) => {
    const user = await requireUser(req);
    rateLimit(`push-key:${user.id}`, 30, 60_000);
    const publicKey = await getPublicKey();
    send(res, 200, { configured: !!publicKey, publicKey });
  },

  'POST /api/push/subscribe': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`push-subscribe:${user.id}`, 20, 10 * 60_000);
    if (!(await getPublicKey())) throw new HttpError(503, 'Notifications non configurées');
    await saveSubscription(user, body);
    send(res, 200, { ok: true });
  },

  'POST /api/push/unsubscribe': async ({ req, res, body }) => {
    const user = await requireUser(req);
    await removeSubscription(user, body.endpoint);
    send(res, 200, { ok: true });
  },

  'POST /api/auth/logout': async ({ req, res, body }) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    // L'appareil ne doit plus recevoir les notifications de ce compte une fois déconnecté
    const user = body?.endpoint ? await getSessionUser(req) : null;
    if (user) await removeSubscription(user, body.endpoint);
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    clearSessionCookie(res);
    send(res, 200, { ok: true });
  },

  'GET /api/me': async ({ req, res }) => send(res, 200, await snapshot(await requireUser(req))),

  'PATCH /api/me': async ({ req, res, body }) => {
    const user = await requireUser(req);
    const name = 'name' in body ? str(body.name, { min: 2, max: 60, field: 'Nom' }) : user.name;
    const title = 'title' in body ? str(body.title, { max: 80, field: 'Titre' }) : user.title;
    const pic = 'avatar' in body ? avatar(body.avatar) : user.avatar;
    const merged =
      'settings' in body
        ? { ...JSON.parse(user.settings || '{}'), ...settings(body.settings) }
        : JSON.parse(user.settings || '{}');
    await db
      .prepare('UPDATE users SET name = ?, title = ?, avatar = ?, settings = ? WHERE id = ?')
      .run(name, title, pic, JSON.stringify(merged), user.id);
    send(res, 200, { ok: true });
  },

  // Changement de mot de passe : exige l'ancien, ferme les autres sessions (appareils perdus ou volés)
  'POST /api/me/password': async ({ req, res, body, trustProxy }) => {
    const user = await requireUser(req);
    rateLimit(`pwchange:${user.id}`, 5, 15 * 60_000);
    if (typeof body.current !== 'string' || body.current.length > 128)
      throw new HttpError(400, 'Mot de passe actuel invalide');
    if (!(await verifyPassword(body.current, user.password_hash))) {
      await logSecurity('password_change_failed', req, trustProxy, user.id);
      throw new HttpError(403, 'Le mot de passe actuel est incorrect.');
    }
    const next = password(body.next, { name: user.name, mail: user.email });
    if (next === body.current)
      throw new HttpError(400, 'Le nouveau mot de passe doit être différent de l’ancien.');
    const hash = await hashPassword(next);
    const current = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    await transaction(async () => {
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
      await db
        .prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?')
        .run(user.id, sha256(current || ''));
    });
    await clearFailures(user.email.toLowerCase());
    await logSecurity('password_changed', req, trustProxy, user.id);
    send(res, 200, { ok: true });
  },

  'POST /api/me/points': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`points:${user.id}`, 120, 60_000);
    const delta = int(body.delta, 1, 200, 'Points');
    // Le navigateur déclare ses points : le serveur en plafonne le total quotidien pour que le classement reste fiable
    const day = new Date().toISOString().slice(0, 10);
    const used =
      (
        await db
          .prepare('SELECT total FROM points_daily WHERE user_id = ? AND day = ?')
          .get(user.id, day)
      )?.total ?? 0;
    const granted = Math.max(0, Math.min(delta, DAILY_POINTS_CAP - used));
    if (granted > 0)
      await db
        .prepare(
          `INSERT INTO points_daily (user_id, day, total) VALUES (?, ?, ?)
           ON CONFLICT(user_id, day) DO UPDATE SET total = points_daily.total + excluded.total`,
        )
        .run(user.id, day, granted);
    send(res, 200, { points: await addPoints(user.id, granted), granted });
  },

  'POST /api/progress': async ({ req, res, body }) => {
    const user = await requireUser(req);
    const courseId = str(body.courseId, { max: 40, field: 'Cours' });
    const lessonId = str(body.lessonId, { max: 40, field: 'Leçon' });
    if (!isValidLesson(courseId, lessonId)) throw new HttpError(404, 'Leçon inconnue');
    const r = await db
      .prepare(
        'INSERT INTO lesson_progress (user_id, course_id, lesson_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      )
      .run(user.id, courseId, lessonId);
    send(res, 200, { newlyCompleted: r.changes > 0 });
  },

  'POST /api/quiz-results': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`quiz:${user.id}`, 30, 60_000);
    const total = int(body.total, 1, 100, 'Total');
    const score = int(body.score, 0, total, 'Score');
    const mode = QUIZ_MODES.has(body.mode) ? body.mode : 'Solo';
    const difficulty =
      body.difficulty == null ? null : str(body.difficulty, { max: 20, field: 'Difficulté' });
    await db
      .prepare(
        'INSERT INTO quiz_results (user_id, score, total, mode, difficulty) VALUES (?, ?, ?, ?, ?)',
      )
      .run(user.id, score, total, mode, difficulty);
    send(res, 201, { ok: true });
  },

  'DELETE /api/quiz-results': async ({ req, res }) => {
    const user = await requireUser(req);
    await db.prepare('DELETE FROM quiz_results WHERE user_id = ?').run(user.id);
    send(res, 200, { ok: true });
  },

  // Correction de l'examen côté serveur : seul le serveur délivre (et signe) les certificats
  'POST /api/exams': async ({ req, res, body }) => {
    const user = await requireUser(req);
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
      const firstTime = !(await db
        .prepare('SELECT 1 FROM certificates WHERE user_id = ? AND course_id = ? AND imported = 0')
        .get(user.id, course.id));
      await transaction(async () => {
        certificate = certificateDto(await issueCertificate(user, course, result.score), user);
        if (firstTime) points = await addPoints(user.id, 150);
      });
    }
    send(res, 200, { ...result, certificate, points });
  },

  // Import unique des données locales (navigateur) lors de la première connexion
  'POST /api/migrate': async ({ req, res, body }) => {
    const user = await requireUser(req);
    if (user.migrated_at) return send(res, 200, await snapshot(user));

    await transaction(async () => {
      const progress = body.progress && typeof body.progress === 'object' ? body.progress : {};
      const insertLesson = db.prepare(
        'INSERT INTO lesson_progress (user_id, course_id, lesson_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      );
      for (const [courseId, lessons] of Object.entries(progress)) {
        if (!Array.isArray(lessons)) continue;
        for (const lessonId of lessons.slice(0, 100)) {
          if (typeof lessonId === 'string' && isValidLesson(courseId, lessonId))
            await insertLesson.run(user.id, courseId, lessonId);
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
        await insertQuiz.run(
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
          !(await db
            .prepare('SELECT 1 FROM certificates WHERE user_id = ? AND course_id = ?')
            .get(user.id, course.id))
        ) {
          await issueCertificate(user, course, c.score, true);
        }
      }

      const points = Number.isInteger(body.points) ? Math.min(Math.max(body.points, 0), 5000) : 0;
      if (points > 0) await addPoints(user.id, points);
      if (body.settings) {
        await db
          .prepare('UPDATE users SET settings = ? WHERE id = ?')
          .run(
            JSON.stringify({ ...JSON.parse(user.settings || '{}'), ...settings(body.settings) }),
            user.id,
          );
      }
      await db.prepare('UPDATE users SET migrated_at = ? WHERE id = ?').run(nowSql(), user.id);
    });
    send(
      res,
      200,
      await snapshot(await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)),
    );
  },

  // Vérification publique d'un certificat (données minimales)
  'GET /api/certificates/verify': async ({ res, url, ip }) => {
    rateLimit(`verify:${ip}`, 60, 60_000);
    const number = String(url.searchParams.get('number') || '').slice(0, 80);
    const c = await db
      .prepare(
        `SELECT c.*, u.name FROM certificates c JOIN users u ON u.id = c.user_id WHERE c.certificate_number = ?`,
      )
      .get(number);
    if (!c) return send(res, 404, { valid: false });
    const valid = crypto.timingSafeEqual(
      Buffer.from(
        await signCertificate(c.certificate_number, c.user_id, c.course_id, c.score, c.issued_at),
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
    const user = await requireUser(req);
    rateLimit(`leaderboard:${user.id}`, 60, 60_000);
    const visible = "COALESCE((u.settings::jsonb) ->> 'showInLeaderboard', 'true') <> 'false'";
    const rows = await db
      .prepare(
        `SELECT u.id, u.name, u.title, u.points,
                (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) AS certificates
         FROM users u WHERE u.points > 0 AND ${visible}
         ORDER BY u.points DESC, u.id ASC LIMIT 50`,
      )
      .all();
    const myVisible =
      (await db.prepare(`SELECT 1 FROM users u WHERE u.id = ? AND ${visible}`).get(user.id)) !==
      undefined;
    const myRank =
      myVisible && user.points > 0
        ? (
            await db
              .prepare(`SELECT COUNT(*) + 1 AS rank FROM users u WHERE u.points > ? AND ${visible}`)
              .get(user.points)
          ).rank
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
    const user = await requireUser(req);
    rateLimit(`community-read:${user.id}`, 120, 60_000);
    const topic = url.searchParams.get('topic');
    const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
    if (topic && !TOPICS.has(topic)) throw new HttpError(400, 'Sujet invalide');
    const posts = await db
      .prepare(
        `SELECT p.id, p.user_id, p.topic, p.body, p.created_at, u.name, u.title, u.points,
                (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likes,
                EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked,
                EXISTS(SELECT 1 FROM post_reports r WHERE r.post_id = p.id AND r.user_id = ?) AS reported,
                (SELECT COUNT(*) FROM post_reports r WHERE r.post_id = p.id) AS reports
         FROM posts p JOIN users u ON u.id = p.user_id
         WHERE p.id < ? AND (?::text IS NULL OR p.topic = ?::text)
         ORDER BY p.id DESC LIMIT 20`,
      )
      .all(user.id, user.id, before, topic, topic);
    const ids = posts.map((p) => p.id);
    const comments = ids.length
      ? await db
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
    const user = await requireUser(req);
    rateLimit(`community-post:${user.id}`, 5, 10 * 60_000);
    const topic = TOPICS.has(body.topic) ? body.topic : 'general';
    const text = longText(body.body, { min: 3, max: 1000 });
    const { id } = await db
      .prepare('INSERT INTO posts (user_id, topic, body) VALUES (?, ?, ?) RETURNING id')
      .get(user.id, topic, text);
    publish(
      'community_post',
      { id, topic, author: publicName(user.name), excerpt: text.replace(/\s+/g, ' ').slice(0, 80) },
      { exceptUserId: user.id },
    );
    pushInBackground(
      communityPostPush({
        author: publicName(user.name),
        excerpt: text.replace(/\s+/g, ' ').slice(0, 80),
      }),
      { exceptUserId: user.id },
    );
    send(res, 201, { id });
  },

  'POST /api/community/comments': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`community-comment:${user.id}`, 20, 10 * 60_000);
    const postId = int(body.postId, 1, Number.MAX_SAFE_INTEGER, 'Message');
    if (!(await db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId)))
      throw new HttpError(404, 'Message introuvable');
    const text = longText(body.body, { min: 1, max: 500, field: 'Commentaire' });
    const { id } = await db
      .prepare('INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?) RETURNING id')
      .get(postId, user.id, text);
    send(res, 201, { id });
  },

  'POST /api/community/like': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`community-like:${user.id}`, 60, 60_000);
    const postId = int(body.postId, 1, Number.MAX_SAFE_INTEGER, 'Message');
    if (!(await db.prepare('SELECT 1 FROM posts WHERE id = ?').get(postId)))
      throw new HttpError(404, 'Message introuvable');
    const removed = (
      await db
        .prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?')
        .run(postId, user.id)
    ).changes;
    if (!removed)
      await db
        .prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
        .run(postId, user.id);
    const likes = (
      await db.prepare('SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?').get(postId)
    ).n;
    send(res, 200, { liked: !removed, likes });
  },

  // Signalement d'un message (modération) : un par membre et par message, pas sur ses propres messages
  'POST /api/community/report': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`community-report:${user.id}`, 10, 10 * 60_000);
    const postId = int(body.postId, 1, Number.MAX_SAFE_INTEGER, 'Message');
    const post = await db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId);
    if (!post) throw new HttpError(404, 'Message introuvable');
    if (post.user_id === user.id)
      throw new HttpError(400, 'Vous ne pouvez pas signaler votre propre message.');
    await db
      .prepare('INSERT INTO post_reports (post_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
      .run(postId, user.id);
    send(res, 200, { reported: true });
  },

  // Suppression : auteur du message ou administrateur
  'DELETE /api/community/posts': async ({ req, res, url }) => {
    const user = await requireUser(req);
    const id = int(Number(url.searchParams.get('id')), 1, Number.MAX_SAFE_INTEGER, 'Message');
    const post = await db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id);
    if (!post) throw new HttpError(404, 'Message introuvable');
    if (post.user_id !== user.id && !isAdmin(user))
      throw new HttpError(403, 'Action non autorisée');
    await db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    send(res, 200, { ok: true });
  },

  'DELETE /api/community/comments': async ({ req, res, url }) => {
    const user = await requireUser(req);
    const id = int(Number(url.searchParams.get('id')), 1, Number.MAX_SAFE_INTEGER, 'Commentaire');
    const c = await db.prepare('SELECT user_id FROM post_comments WHERE id = ?').get(id);
    if (!c) throw new HttpError(404, 'Commentaire introuvable');
    if (c.user_id !== user.id && !isAdmin(user)) throw new HttpError(403, 'Action non autorisée');
    await db.prepare('DELETE FROM post_comments WHERE id = ?').run(id);
    send(res, 200, { ok: true });
  },

  // Avis des utilisateurs : lecture publique (accueil), écriture réservée aux comptes
  'GET /api/reviews': async ({ res, ip }) => {
    rateLimit(`reviews:${ip}`, 60, 60_000);
    const stats = await db
      .prepare('SELECT COUNT(*) AS cnt, AVG(rating)::float8 AS avg FROM reviews')
      .get();
    const rows = await db
      .prepare(
        `SELECT r.id, r.rating, r.body, r.created_at, u.name, u.points
         FROM reviews r JOIN users u ON u.id = r.user_id
         ORDER BY r.id DESC LIMIT 6`,
      )
      .all();
    send(
      res,
      200,
      {
        members: await memberCount(),
        average: Math.round(Number(stats.avg || 0) * 10) / 10,
        count: Number(stats.cnt),
        reviews: rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          author: publicName(r.name),
          authorLevel: levelFor(r.points),
          createdAt: r.created_at.replace(' ', 'T') + 'Z',
        })),
      },
      { 'Cache-Control': 'no-store' },
    );
  },

  'GET /api/reviews/mine': async ({ req, res }) => {
    const user = await requireUser(req);
    const row = await db
      .prepare('SELECT id, rating, body FROM reviews WHERE user_id = ?')
      .get(user.id);
    send(res, 200, { review: row || null });
  },

  // Création ou mise à jour de son avis (un seul par compte)
  'POST /api/reviews': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`review-write:${user.id}`, 10, 10 * 60_000);
    const rating = int(body.rating, 1, 5, 'Note');
    const text = longText(body.body, { min: 10, max: 500, field: 'Avis' });
    await db
      .prepare(
        `INSERT INTO reviews (user_id, rating, body) VALUES (?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE
         SET rating = EXCLUDED.rating, body = EXCLUDED.body,
             updated_at = to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`,
      )
      .run(user.id, rating, text);
    send(res, 200, { ok: true });
  },

  // Sans ?id : supprime son propre avis. Avec ?id : réservé aux administrateurs.
  'DELETE /api/reviews': async ({ req, res, url }) => {
    const user = await requireUser(req);
    const idParam = url.searchParams.get('id');
    if (idParam === null) {
      await db.prepare('DELETE FROM reviews WHERE user_id = ?').run(user.id);
    } else {
      if (!isAdmin(user)) throw new HttpError(403, 'Action non autorisée');
      const id = int(Number(idParam), 1, Number.MAX_SAFE_INTEGER, 'Avis');
      const { changes } = await db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
      if (!changes) throw new HttpError(404, 'Avis introuvable');
    }
    send(res, 200, { ok: true });
  },

  // Administration (DevOps) : réservée aux comptes listés dans ADMIN_EMAILS
  'GET /api/devops/status': async ({ req, res }) => {
    await requireAdmin(req);
    const mem = process.memoryUsage();
    const count = async (table) =>
      (await db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get()).cnt;
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
        users: await count('users'),
        certificates: await count('certificates'),
        activeSessions: await count('sessions'),
        pushDevices: await countSubscriptions(),
      },
      timestamp: new Date().toISOString(),
    });
  },

  // Annonce d'une nouveauté à tous les membres : notification dans l'application ouverte et push sinon
  'POST /api/admin/announce': async ({ req, res, body }) => {
    const admin = await requireAdmin(req);
    rateLimit(`announce:${admin.id}`, 5, 10 * 60_000);
    const oneLine = (s) => s.replace(/\s*\n\s*/g, ' ');
    const title = oneLine(longText(body.title, { min: 3, max: 80, field: 'Titre' }));
    const text = oneLine(longText(body.body, { min: 3, max: 200, field: 'Message' }));
    publish('announce', { title, body: text });
    pushInBackground(announcementPush({ title, body: text }));
    send(res, 200, { ok: true });
  },

  // Déverrouillage de l'espace administrateur : état, saisie du mot de passe admin, verrouillage
  'GET /api/admin/status': async ({ req, res }) => {
    await requireAdminAccount(req);
    send(res, 200, {
      configured: await adminPasswordConfigured(),
      unlocked: await isUnlocked(req),
    });
  },

  // Première configuration : seulement tant qu'aucun mot de passe administrateur n'est encore défini.
  // Au-delà, passer par /api/admin/change-password (exige l'ancien mot de passe).
  'POST /api/admin/bootstrap': async ({ req, res, body, trustProxy }) => {
    const user = await requireAdminAccount(req);
    if (await adminPasswordConfigured())
      throw new HttpError(
        409,
        'Un mot de passe administrateur est déjà configuré. Utilisez le changement de mot de passe.',
      );
    if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD)
      throw new HttpError(
        400,
        `Le mot de passe administrateur doit contenir au moins ${MIN_PASSWORD} caractères.`,
      );
    if (body.password.length > 200)
      throw new HttpError(
        400,
        'Le mot de passe administrateur ne doit pas dépasser 200 caractères.',
      );
    const hash = await hashPassword(body.password);
    await db
      .prepare(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      )
      .run(ADMIN_HASH_META_KEY, hash);
    await unlockSession(req);
    await logSecurity('admin_password_configured', req, trustProxy, user.id);
    send(res, 200, { configured: true, unlocked: true, minutes: ADMIN_UNLOCK_MS / 60_000 });
  },

  'POST /api/admin/unlock': async ({ req, res, body, ip, trustProxy }) => {
    const user = await requireAdminAccount(req);
    if (!(await adminPasswordConfigured()))
      throw new HttpError(
        503,
        'Le mot de passe administrateur n’est pas encore défini. Ouvrez le Centre DevOps pour le configurer.',
      );
    rateLimit(`admin-unlock-ip:${ip}`, 20, 60 * 60_000);
    const key = `admin:${user.id}`; // même mécanisme de blocage que la connexion (5 échecs = 15 min)
    await checkLock(key);
    if (
      typeof body.email !== 'string' ||
      body.email.length > 254 ||
      typeof body.password !== 'string' ||
      body.password.length > 200
    ) {
      throw new HttpError(400, 'Identifiants administrateur invalides.');
    }
    // Le mot de passe est toujours vérifié (même durée que l'e-mail soit bon ou non), puis l'e-mail doit
    // correspondre au compte connecté : un seul message d'erreur dans les deux cas
    const passwordOk = await verifyPassword(body.password, await getAdminHash());
    const emailOk = body.email.trim().toLowerCase() === user.email.toLowerCase();
    if (!passwordOk || !emailOk) {
      await recordFailure(key);
      await logSecurity('admin_unlock_failed', req, trustProxy, user.id);
      throw new HttpError(403, 'Identifiants administrateur incorrects.');
    }
    await clearFailures(key);
    await unlockSession(req);
    await logSecurity('admin_unlock', req, trustProxy, user.id);
    send(res, 200, { unlocked: true, minutes: ADMIN_UNLOCK_MS / 60_000 });
  },

  'POST /api/admin/lock': async ({ req, res }) => {
    await requireAdminAccount(req);
    await db
      .prepare('UPDATE sessions SET admin_unlocked_until = NULL WHERE token_hash = ?')
      .run(sha256(sessionToken(req)));
    send(res, 200, { unlocked: false });
  },

  // Changement du mot de passe administrateur une fois configuré : exige l'ancien (comme pour un compte).
  'POST /api/admin/change-password': async ({ req, res, body, trustProxy }) => {
    const user = await requireAdmin(req); // déjà configuré et déverrouillé
    if (
      typeof body.current !== 'string' ||
      !(await verifyPassword(body.current, await getAdminHash()))
    )
      throw new HttpError(403, 'Le mot de passe administrateur actuel est incorrect.');
    if (typeof body.next !== 'string' || body.next.length < MIN_PASSWORD)
      throw new HttpError(
        400,
        `Le nouveau mot de passe administrateur doit contenir au moins ${MIN_PASSWORD} caractères.`,
      );
    if (body.next.length > 200)
      throw new HttpError(
        400,
        'Le mot de passe administrateur ne doit pas dépasser 200 caractères.',
      );
    const hash = await hashPassword(body.next);
    await db
      .prepare(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      )
      .run(ADMIN_HASH_META_KEY, hash);
    await logSecurity('admin_password_changed', req, trustProxy, user.id);
    send(res, 200, { ok: true });
  },

  // Liste des membres (administrateurs uniquement) : jamais de hash de mot de passe ni de jeton
  'GET /api/admin/users': async ({ req, res }) => {
    await requireAdmin(req);
    const rows = await db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.points, u.created_at, u.terms_accepted_at, u.terms_version,
                (SELECT MAX(created_at) FROM security_log s WHERE s.user_id = u.id AND s.event LIKE 'login%') AS last_login_at,
                (SELECT COUNT(*) FROM lesson_progress l WHERE l.user_id = u.id) AS lessons,
                (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) AS certificates,
                (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS posts
           FROM users u ORDER BY u.id DESC LIMIT 5000`,
      )
      .all();
    const users = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      points: u.points,
      level: levelFor(u.points),
      lessons: u.lessons,
      certificates: u.certificates,
      posts: u.posts,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      termsAcceptedAt: u.terms_accepted_at,
      termsVersion: u.terms_version,
    }));
    send(res, 200, { total: users.length, users });
  },

  // Mot de passe oublié sans e-mail : l'administrateur génère un mot de passe temporaire (affiché une seule fois),
  // toutes les sessions du membre sont fermées. Les comptes administrateurs sont exclus (réinitialisation en ligne de commande).
  'POST /api/admin/users/reset-password': async ({ req, res, body }) => {
    const admin = await requireAdmin(req);
    rateLimit(`admin-reset:${admin.id}`, 20, 60 * 60_000);
    const id = int(body.userId, 1, Number.MAX_SAFE_INTEGER, 'Membre');
    const target = await db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
    if (!target) throw new HttpError(404, 'Membre introuvable');
    if (isAdmin(target))
      throw new HttpError(
        400,
        'Le mot de passe d’un administrateur se réinitialise en ligne de commande (npm run admin:reset-password).',
      );
    const temporaryPassword = await resetUserPassword(target.email, `admin:${admin.id}`);
    send(res, 200, { email: target.email, temporaryPassword });
  },

  // Sauvegarde téléchargeable (JSON). Contient les empreintes de mots de passe : à conserver comme un secret.
  'GET /api/devops/backup': async ({ req, res }) => {
    const admin = await requireAdmin(req);
    rateLimit(`backup:${admin.id}`, 5, 10 * 60_000);
    send(res, 200, await exportAll());
  },

  'POST /api/devops/exec': async ({ req, res, body }) => {
    const admin = await requireAdmin(req);
    rateLimit(`devops-exec:${admin.id}`, 10, 10 * 60_000);
    const action = body.action;
    if (action === 'clear_sessions') {
      const info = await db
        .prepare('DELETE FROM sessions WHERE expires_at < ?')
        .run(new Date().toISOString());
      return send(res, 200, {
        success: true,
        message: `${info.changes} sessions expirées purgées.`,
      });
    }
    if (action === 'vacuum') {
      await db.exec('VACUUM ANALYZE');
      return send(res, 200, {
        success: true,
        message: 'Base de données optimisée (VACUUM ANALYZE exécuté).',
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
    // La déconnexion lit son corps de façon tolérante : un corps invalide ne doit jamais l'empêcher
    const body =
      mutating && req.method !== 'DELETE'
        ? url.pathname === '/api/auth/logout'
          ? await readJson(req).catch(() => ({}))
          : await readJson(req)
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
  () =>
    db
      .prepare('DELETE FROM sessions WHERE expires_at < ?')
      .run(new Date().toISOString())
      .catch((err) => console.error('[api] Purge des sessions impossible :', err.message)),
  3_600_000,
).unref();
