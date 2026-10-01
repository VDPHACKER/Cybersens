// Base de données PostgreSQL.
//  - Production : variable DATABASE_URL (Neon, Supabase, tout PostgreSQL) via le pilote « pg ».
//  - Développement et tests : PGlite (PostgreSQL embarqué, sans installation), dossier DB_PATH (data/pglite par défaut).
// Toutes les requêtes sont paramétrées (aucune concaténation SQL). Les placeholders s'écrivent « ? » et sont convertis en $1, $2…
import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATABASE_URL = process.env.DATABASE_URL || '';
const PGLITE_DIR = process.env.DB_PATH || path.join(ROOT, 'data', 'pglite');

/** Description de la base pour les journaux (ne contient jamais d'identifiants). */
export const DB_LABEL = DATABASE_URL
  ? `PostgreSQL ${new URL(DATABASE_URL).host}`
  : `PGlite ${PGLITE_DIR}`;

// Horodatage texte « AAAA-MM-JJ HH:MM:SS » (UTC) : même format que l'ancienne base, utilisé par tout le code
const NOW = `to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`;

// Migrations successives : ne jamais modifier une migration déjà livrée, en ajouter une nouvelle.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email             TEXT NOT NULL,
    name              TEXT NOT NULL,
    role              TEXT NOT NULL,
    title             TEXT,
    avatar            TEXT,
    password_hash     TEXT NOT NULL,
    points            INTEGER NOT NULL DEFAULT 0,
    settings          TEXT NOT NULL DEFAULT '{}',
    migrated_at       TEXT,
    terms_accepted_at TEXT,
    terms_version     TEXT,
    created_at        TEXT NOT NULL DEFAULT (${NOW})
  );
  CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

  CREATE TABLE sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (${NOW}),
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX idx_sessions_user ON sessions(user_id);

  CREATE TABLE lesson_progress (
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id    TEXT NOT NULL,
    lesson_id    TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (${NOW}),
    PRIMARY KEY (user_id, course_id, lesson_id)
  );

  CREATE TABLE certificates (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id          TEXT NOT NULL,
    course_title       TEXT NOT NULL,
    score              INTEGER NOT NULL,
    certificate_number TEXT NOT NULL UNIQUE,
    verification_hash  TEXT NOT NULL,
    imported           INTEGER NOT NULL DEFAULT 0,
    issued_at          TEXT NOT NULL DEFAULT (${NOW}),
    UNIQUE (user_id, course_id)
  );

  CREATE TABLE quiz_results (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    mode       TEXT NOT NULL,
    difficulty TEXT,
    played_at  TEXT NOT NULL DEFAULT (${NOW})
  );
  CREATE INDEX idx_quiz_user ON quiz_results(user_id, played_at);

  CREATE TABLE login_attempts (
    key          TEXT PRIMARY KEY,
    failures     INTEGER NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0
  );

  CREATE TABLE security_log (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT,
    event      TEXT NOT NULL,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (${NOW})
  );
  CREATE INDEX idx_security_user ON security_log(user_id, created_at);

  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE posts (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic      TEXT NOT NULL DEFAULT 'general',
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (${NOW})
  );
  CREATE INDEX idx_posts_topic ON posts(topic, id DESC);

  CREATE TABLE post_comments (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (${NOW})
  );
  CREATE INDEX idx_comments_post ON post_comments(post_id, id);

  CREATE TABLE post_likes (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE points_daily (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     TEXT NOT NULL,
    total   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );

  CREATE TABLE post_reports (
    post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (${NOW}),
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (${NOW})
  );
  `,
  // Déverrouillage administrateur (mot de passe admin saisi) : attaché à la session, expire seul
  `
  ALTER TABLE sessions ADD COLUMN admin_unlocked_until TEXT;
  `,
];

// ---------- Pilotes ----------
const connectPostgres = async () => {
  const { default: pg } = await import('pg');
  pg.types.setTypeParser(20, (v) => Number(v)); // int8 (COUNT, identifiants) en nombre JavaScript
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000, // laisse le temps à une base serverless de se réveiller
    keepAlive: true,
  });
  pool.on('error', (err) => console.error('[db] Connexion inactive perdue :', err.message));
  return {
    query: (sql, params, tx) => (tx ?? pool).query(sql, params),
    exec: (sql, tx) => (tx ?? pool).query(sql),
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
};

const connectPglite = async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  fs.mkdirSync(path.dirname(PGLITE_DIR), { recursive: true });
  const lite = new PGlite(PGLITE_DIR);
  await lite.waitReady;
  return {
    query: (sql, params, tx) => (tx ?? lite).query(sql, params),
    exec: (sql, tx) => (tx ?? lite).exec(sql),
    transaction: (fn) => lite.transaction(fn),
    close: () => lite.close(),
  };
};

const driver = DATABASE_URL ? await connectPostgres() : await connectPglite();

// Transaction en cours pour la requête courante : tout appel à db.* à l'intérieur en fait partie
const txContext = new AsyncLocalStorage();

/** « ? » → « $1, $2… » (les « ? » entre apostrophes sont conservés). */
const toPositional = (sql) => {
  let n = 0;
  let inString = false;
  let out = '';
  for (const ch of sql) {
    if (ch === "'") inString = !inString;
    out += ch === '?' && !inString ? `$${++n}` : ch;
  }
  return out;
};

const run = async (sql, params = []) => {
  const res = await driver.query(
    toPositional(sql),
    params.map((p) => (p === undefined ? null : p)),
    txContext.getStore(),
  );
  return { rows: res.rows, changes: res.rowCount ?? res.affectedRows ?? 0 };
};

/** API asynchrone : db.prepare(sql).get(...) / .all(...) / .run(...) (run renvoie { changes }). */
export const db = {
  prepare: (sql) => ({
    get: async (...params) => (await run(sql, params)).rows[0],
    all: async (...params) => (await run(sql, params)).rows,
    run: async (...params) => ({ changes: (await run(sql, params)).changes }),
  }),
  exec: (sql) => driver.exec(sql, txContext.getStore()),
};

/** Exécute fn dans une transaction (annulée en cas d'erreur). Les transactions imbriquées rejoignent la première. */
export const transaction = (fn) =>
  txContext.getStore() ? fn() : driver.transaction((tx) => txContext.run(tx, fn));

// ---------- Migrations ----------
await driver.transaction(async (tx) => {
  // Verrou posé avant tout : deux instances qui démarrent en même temps (redéploiement) se succèdent au lieu de se concurrencer
  await driver.query('SELECT pg_advisory_xact_lock(727274)', [], tx);
  await driver.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
    tx,
  );
  const { rows } = await driver.query(
    'SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations',
    [],
    tx,
  );
  for (let i = Number(rows[0].v); i < MIGRATIONS.length; i++) {
    await driver.exec(MIGRATIONS[i], tx);
    await driver.query(
      'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)',
      [i + 1, new Date().toISOString()],
      tx,
    );
  }
});

/** Secret serveur pour signer les certificats : CERT_SECRET, sinon généré une fois et conservé en base. */
export const getServerSecret = async () => {
  if (process.env.CERT_SECRET) return process.env.CERT_SECRET;
  const row = await db.prepare("SELECT value FROM meta WHERE key = 'cert_secret'").get();
  if (row) return row.value;
  const secret = crypto.randomBytes(32).toString('hex');
  await db
    .prepare("INSERT INTO meta (key, value) VALUES ('cert_secret', ?) ON CONFLICT (key) DO NOTHING")
    .run(secret);
  return (await db.prepare("SELECT value FROM meta WHERE key = 'cert_secret'").get()).value;
};

/** Fermeture propre (arrêt du serveur). */
export const closeDb = async () => {
  try {
    await driver.close();
  } catch {
    // déjà fermée
  }
};

// Tables exportées par la sauvegarde (les sessions, jetons de réinitialisation et compteurs de blocage sont éphémères)
const EXPORT_TABLES = [
  'users',
  'lesson_progress',
  'certificates',
  'quiz_results',
  'posts',
  'post_comments',
  'post_likes',
  'post_reports',
  'points_daily',
  'security_log',
  'meta',
];

/** Export complet (JSON) des données : contient les empreintes de mots de passe, à traiter comme un secret. */
export const exportAll = async () => {
  const tables = {};
  for (const name of EXPORT_TABLES) tables[name] = await db.prepare(`SELECT * FROM ${name}`).all();
  return { exportedAt: new Date().toISOString(), tables };
};

/** Sauvegarde dans un fichier JSON (utilisable pendant que le serveur tourne). */
export const backupTo = async (destination) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(await exportAll()), { mode: 0o600 });
};
