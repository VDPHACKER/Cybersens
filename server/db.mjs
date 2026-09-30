// Base de données SQLite (module natif node:sqlite, Node >= 22.13).
// Fichier : data/cybersens.db (modifiable via DB_PATH). Toutes les requêtes sont préparées (aucune concaténation SQL).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'cybersens.db');

// Migrations successives : ne jamais modifier une migration déjà livrée, en ajouter une nouvelle.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL,
    title         TEXT,
    avatar        TEXT,
    password_hash TEXT NOT NULL,
    points        INTEGER NOT NULL DEFAULT 0,
    settings      TEXT NOT NULL DEFAULT '{}',
    migrated_at   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX idx_sessions_user ON sessions(user_id);

  CREATE TABLE lesson_progress (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id    TEXT NOT NULL,
    lesson_id    TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, course_id, lesson_id)
  );

  CREATE TABLE certificates (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id          TEXT NOT NULL,
    course_title       TEXT NOT NULL,
    score              INTEGER NOT NULL,
    certificate_number TEXT NOT NULL UNIQUE,
    verification_hash  TEXT NOT NULL,
    imported           INTEGER NOT NULL DEFAULT 0,
    issued_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, course_id)
  );

  CREATE TABLE quiz_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    mode       TEXT NOT NULL,
    difficulty TEXT,
    played_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_quiz_user ON quiz_results(user_id, played_at);

  CREATE TABLE login_attempts (
    key          TEXT PRIMARY KEY,
    failures     INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE security_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    event      TEXT NOT NULL,
    ip         TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // Communauté : messages, commentaires et « j'aime »
  `
  CREATE TABLE posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic      TEXT NOT NULL DEFAULT 'general',
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_posts_topic ON posts(topic, id DESC);

  CREATE TABLE post_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_comments_post ON post_comments(post_id, id);

  CREATE TABLE post_likes (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
  );
  `,
  // Plafond quotidien des points déclarés par le navigateur (anti-triche pour le classement)
  `
  CREATE TABLE points_daily (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     TEXT NOT NULL,
    total   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
  `,
  // Signalements de messages de la communauté (un signalement par membre et par message)
  `
  CREATE TABLE post_reports (
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (post_id, user_id)
  );
  `,
  // Jetons de réinitialisation de mot de passe (stockés hachés, à usage unique, 30 min)
  `
  CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
];

const open = () => {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  return db;
};

export const db = open();

/** Exécute fn dans une transaction (annulée en cas d'erreur). */
export const transaction = (fn) => {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

/** Secret serveur pour signer les certificats : CERT_SECRET, sinon généré une fois et conservé en base. */
export const getServerSecret = () => {
  if (process.env.CERT_SECRET) return process.env.CERT_SECRET;
  const row = db.prepare("SELECT value FROM meta WHERE key = 'cert_secret'").get();
  if (row) return row.value;
  const secret = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO meta (key, value) VALUES ('cert_secret', ?)").run(secret);
  return secret;
};

/** Fermeture propre (arrêt du serveur) : écrit le journal WAL dans le fichier principal. */
export const closeDb = () => {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.close();
  } catch {
    // déjà fermée
  }
};

/** Sauvegarde cohérente à chaud (utilisable pendant que le serveur tourne). */
export const backupTo = (destination) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  db.prepare('VACUUM INTO ?').run(destination);
};
