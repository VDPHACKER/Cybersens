// Migration des données d'une base PostgreSQL vers une autre (Neon → Supabase…) : copie fidèle, source intacte.
// Les deux bases sont des PGlite en mémoire ; le schéma est celui de l'application (MIGRATIONS).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-migdata-'));
process.env.DB_PATH = path.join(tmpDir, 'pglite');
const { MIGRATIONS, closeDb } = await import('../server/db.mjs');
const { copyData } = await import('../server/migrateData.mjs');

after(async () => {
  await closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const adapt = (lite, log) => ({
  query: async (sql, params) => {
    log?.push(sql);
    return lite.query(sql, params);
  },
});

/** Base vide avec le schéma de l'application, jusqu'à la migration `upTo` incluse (toutes par défaut). */
const newDatabase = async (upTo = MIGRATIONS.length) => {
  const lite = new PGlite();
  await lite.waitReady;
  for (let i = 0; i < upTo; i++) await lite.exec(MIGRATIONS[i]);
  return lite;
};

const seed = async (lite, { withVerifiedColumn = true } = {}) => {
  const cols = withVerifiedColumn ? ', email_verified_at' : '';
  const vals = withVerifiedColumn ? ", '2026-01-01 10:00:00'" : '';
  for (const [id, name] of [
    [5, 'Awa'],
    [9, 'Issa'],
    [42, 'Fati'],
  ])
    await lite.query(
      `INSERT INTO users (id, email, name, role, password_hash, created_at${cols}) OVERRIDING SYSTEM VALUE
       VALUES ($1, $2, $3, 'Étudiant', 'scrypt$x', '2026-01-01 10:00:00'${vals})`,
      [id, `${name.toLowerCase()}@test.bf`, name],
    );
  await lite.query(
    "INSERT INTO lesson_progress (user_id, course_id, lesson_id) VALUES (5, 'c1', 'l1'), (5, 'c1', 'l2'), (9, 'c2', 'l1')",
  );
  await lite.query(
    "INSERT INTO posts (id, user_id, body) OVERRIDING SYSTEM VALUE VALUES (7, 5, 'Bonjour à tous')",
  );
  await lite.query("INSERT INTO post_comments (post_id, user_id, body) VALUES (7, 9, 'Bienvenue')");
  await lite.query("INSERT INTO meta (key, value) VALUES ('cert_secret', 'secret-de-test')");
};

const dump = async (lite, table, order) =>
  (await lite.query(`SELECT * FROM ${table} ORDER BY ${order}`)).rows;

test('copie fidèle : mêmes lignes, mêmes identifiants, séquences relancées', async () => {
  const src = await newDatabase();
  const dst = await newDatabase();
  await seed(src);

  const report = await copyData(adapt(src), adapt(dst), { log: () => {} });
  assert.equal(report.ok, true);

  for (const [table, order] of [
    ['users', 'id'],
    ['lesson_progress', 'user_id, course_id, lesson_id'],
    ['posts', 'id'],
    ['post_comments', 'id'],
    ['meta', 'key'],
  ])
    assert.deepEqual(await dump(dst, table, order), await dump(src, table, order), table);

  // Les identifiants générés repartent après le plus grand : aucun doublon au prochain inscrit
  const next = await dst.query(
    "INSERT INTO users (email, name, role, password_hash) VALUES ('nouveau@test.bf', 'Nouveau', 'Étudiant', 'x') RETURNING id",
  );
  assert.ok(Number(next.rows[0].id) > 42, `nouvel identifiant ${next.rows[0].id}`);
});

test('la source n’est ni modifiée ni supprimée : aucune écriture ne lui est envoyée', async () => {
  const src = await newDatabase();
  const dst = await newDatabase();
  await seed(src);
  const before = await dump(src, 'users', 'id');
  const sent = [];

  await copyData(adapt(src, sent), adapt(dst), { log: () => {} });

  const writes = sent.filter((s) =>
    /^\s*(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|SELECT\s+setval)/i.test(s),
  );
  assert.deepEqual(writes, [], 'la source ne reçoit que des lectures');
  assert.deepEqual(await dump(src, 'users', 'id'), before);
});

test('cible déjà remplie : refus net, rien n’est écrasé ni supprimé', async () => {
  const src = await newDatabase();
  const dst = await newDatabase();
  await seed(src);
  await dst.query(
    "INSERT INTO users (email, name, role, password_hash) VALUES ('deja@test.bf', 'Déjà là', 'Étudiant', 'x')",
  );

  await assert.rejects(
    () => copyData(adapt(src), adapt(dst), { log: () => {} }),
    /déjà des données/i,
  );
  const rows = await dump(dst, 'users', 'id');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'deja@test.bf');
});

test('copie interrompue : la cible reste vide (tout ou rien)', async () => {
  const src = await newDatabase();
  const dst = await newDatabase();
  await seed(src);
  // Une ligne que la cible refusera (clé étrangère) fait échouer la copie en cours de route
  await src.query('ALTER TABLE post_comments DROP CONSTRAINT post_comments_post_id_fkey');
  await src.query(
    "INSERT INTO post_comments (post_id, user_id, body) VALUES (999, 9, 'orpheline')",
  );

  await assert.rejects(() => copyData(adapt(src), adapt(dst), { log: () => {} }));
  assert.equal(Number((await dst.query('SELECT COUNT(*) AS n FROM users')).rows[0].n), 0);
  assert.equal(Number((await dst.query('SELECT COUNT(*) AS n FROM post_comments')).rows[0].n), 0);
});

test('source plus ancienne (sans confirmation d’e-mail) : les comptes copiés restent confirmés', async () => {
  const oldSchemaVersion = MIGRATIONS.length - 1; // avant la migration « email_verified_at »
  const src = await newDatabase(oldSchemaVersion);
  const dst = await newDatabase();
  await seed(src, { withVerifiedColumn: false });

  const report = await copyData(adapt(src), adapt(dst), { log: () => {} });
  assert.equal(report.ok, true);
  const users = await dump(dst, 'users', 'id');
  assert.equal(users.length, 3);
  for (const u of users)
    assert.equal(u.email_verified_at, u.created_at, 'comptes existants considérés confirmés');
});
