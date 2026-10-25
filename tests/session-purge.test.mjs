// Purge des sessions expirées : déclenchée par l'activité réelle (connexion), jamais par un minuteur qui
// réveillerait une base serverless endormie (Neon, Supabase…) toutes les heures sans aucun visiteur.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
let db;
before(async () => {
  h = await startHarness('session-purge');
  ({ db } = await import('../server/db.mjs'));
});
after(async () => {
  await h.stop();
});

const expiredCount = async () =>
  Number(
    (
      await db
        .prepare('SELECT COUNT(*) AS n FROM sessions WHERE expires_at < ?')
        .get(new Date().toISOString())
    ).n,
  );

test('une connexion purge les sessions expirées, sans minuteur', async () => {
  const c = await h.register('Purge Test', 'purge@test.bf');
  const userId = (await c.call('GET', '/api/me')).data.user.id;
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run('expiree-1', userId, new Date(Date.now() - 86_400_000).toISOString());
  assert.equal(await expiredCount(), 1);

  // La purge est limitée à une fois par heure : on oublie la dernière pour ce test
  const { resetSessionPurge } = await import('../server/api.mjs');
  resetSessionPurge();
  const login = await h.client().call('POST', '/api/auth/login', {
    email: 'purge@test.bf',
    password: 'soleil-riviere-mangue-7',
  });
  assert.equal(login.status, 200);
  assert.equal(await expiredCount(), 0, 'la session expirée a disparu');
});

test('la purge n’a lieu qu’une fois par heure au plus', async () => {
  const c = await h.register('Purge Deux', 'purge2@test.bf');
  const userId = (await c.call('GET', '/api/me')).data.user.id;
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run('expiree-2', userId, new Date(Date.now() - 86_400_000).toISOString());
  // Les connexions qui viennent d’avoir lieu (inscriptions) ont déjà déclenché la purge de l’heure
  await h.client().call('POST', '/api/auth/login', {
    email: 'purge2@test.bf',
    password: 'soleil-riviere-mangue-7',
  });
  assert.equal(await expiredCount(), 1, 'pas de nouvelle purge dans l’heure');
});
