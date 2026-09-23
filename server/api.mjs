// API JSON de CyberSens : comptes, sessions, progression, certificats, quiz.
// Monté sous /api par server/index.mjs (production) et par vite.config.ts (développement).
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db, transaction, getServerSecret } from './db.mjs';
import { getCourse, isValidLesson, gradeExam } from './courses.mjs';

const scrypt = promisify(crypto.scrypt);

// ---------- Paramètres ----------
const SESSION_COOKIE = 'cs_session';
const SESSION_DAYS = 30;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_AVATAR_CHARS = 400_000; // ≈ 300 Ko d'image en data URL
const SCRYPT = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }; // paramètres recommandés par l'OWASP
const MIN_PASSWORD = 12;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60_000;
const ROLES = new Set(['Particulier', 'Étudiant', 'Professionnel', 'Entreprise']);
const QUIZ_MODES = new Set(['Solo', 'Multi']);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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

// Protection CSRF : les requêtes qui modifient des données doivent venir de ce site
const checkOrigin = (req) => {
  const origin = req.headers.origin;
  if (!origin) return; // clients non-navigateurs (pas de risque CSRF)
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Origine refusée');
  }
  if (host !== req.headers.host) throw new HttpError(403, 'Origine refusée');
};

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
  return out;
};

// ---------- Mots de passe ----------
const hashPassword = async (plain) => {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(plain, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${key.toString('hex')}`;
};

const verifyPassword = async (plain, stored) => {
  const [algo, N, r, p, saltHex, keyHex] = String(stored).split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(keyHex, 'hex');
  const key = await scrypt(plain, Buffer.from(saltHex, 'hex'), expected.length, {
    N: +N,
    r: +r,
    p: +p,
    maxmem: SCRYPT.maxmem,
  });
  return crypto.timingSafeEqual(key, expected);
};

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
    : 'CyberSens Academy • Directeur: VDPHACKER',
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

  'POST /api/me/points': async ({ req, res, body }) => {
    const user = requireUser(req);
    rateLimit(`points:${user.id}`, 120, 60_000);
    const delta = int(body.delta, 1, 200, 'Points');
    send(res, 200, { points: addPoints(user.id, delta) });
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
    if (mutating) checkOrigin(req);
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
