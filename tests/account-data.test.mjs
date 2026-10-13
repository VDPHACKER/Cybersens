// Droits des membres sur leurs données : export complet (portabilité) et suppression du compte (effacement).
// Fichier séparé : base temporaire et limites de débit indépendantes des autres tests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

const PASSWORD = 'soleil-riviere-mangue-7';
const ADMIN_MAIL = 'direction@test.bf';

let h;
let db;
let resetRateLimits;
before(async () => {
  h = await startHarness('account-data', { ADMIN_EMAILS: ADMIN_MAIL });
  ({ db } = await import('../server/db.mjs'));
  ({ resetRateLimits } = await import('../server/api.mjs'));
});
after(async () => {
  delete process.env.ADMIN_EMAILS;
  await h.stop();
});

const count = async (sql, ...args) => Number((await db.prepare(sql).get(...args)).n);

test('export : réservé aux connectés, complet, sans secret ni donnée d’autrui', async () => {
  assert.equal((await h.client().call('GET', '/api/me/export')).status, 401);

  const other = await h.register('Autre Membre', 'autre@test.bf');
  await other.call('POST', '/api/community/posts', {
    body: 'Message confidentiel de quelqu’un d’autre',
  });

  const c = await h.register('Marie Export', 'marie@test.bf');
  await c.call('POST', '/api/community/posts', { body: 'Mon premier message public' });
  await c.call('POST', '/api/me/points', { delta: 40, source: 'game' });

  const res = await c.call('GET', '/api/me/export');
  assert.equal(res.status, 200);
  assert.equal(res.data.profile.email, 'marie@test.bf');
  assert.equal(res.data.profile.name, 'Marie Export');
  assert.equal(res.data.profile.points, 40);
  assert.ok(Array.isArray(res.data.posts));
  assert.equal(res.data.posts.length, 1);
  assert.equal(res.data.posts[0].body, 'Mon premier message public');
  assert.ok(res.data.securityEvents.some((e) => e.event === 'register'));

  const raw = JSON.stringify(res.data);
  assert.doesNotMatch(raw, /password_hash|scrypt\$/, 'aucune empreinte de mot de passe');
  assert.doesNotMatch(raw, /token_hash/, 'aucun jeton');
  assert.doesNotMatch(
    raw,
    /Message confidentiel|autre@test\.bf/,
    'aucune donnée d’un autre membre',
  );
});

test('export : limité à quelques demandes par heure', async () => {
  const c = await h.register('Gourmand', 'gourmand@test.bf');
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await c.call('GET', '/api/me/export')).status);
  assert.ok(statuses.includes(429), `limite atteinte (${statuses.join(',')})`);
  resetRateLimits('export:');
});

test('suppression : exige le mot de passe, efface tout, journal anonymisé', async () => {
  const c = await h.register('Partante', 'partante@test.bf');
  const authorId = (await c.call('GET', '/api/me')).data.user.id;
  await c.call('POST', '/api/community/posts', { body: 'Un message qui doit disparaître' });
  await c.call('POST', '/api/me/points', { delta: 30, source: 'game' });

  assert.equal(
    (await c.call('POST', '/api/me/delete', {})).status,
    400,
    'mot de passe obligatoire',
  );
  const wrong = await c.call('POST', '/api/me/delete', { password: 'mauvais-mot-de-passe-1' });
  assert.equal(wrong.status, 403);
  assert.equal((await c.call('GET', '/api/me')).status, 200, 'le compte existe toujours');

  const ok = await c.call('POST', '/api/me/delete', { password: PASSWORD });
  assert.equal(ok.status, 200);
  assert.equal((await c.call('GET', '/api/me')).status, 401, 'la session est fermée');
  const relog = await h.client().call('POST', '/api/auth/login', {
    email: 'partante@test.bf',
    password: PASSWORD,
  });
  assert.equal(relog.status, 401, 'le compte n’existe plus');

  assert.equal(await count('SELECT COUNT(*) AS n FROM users WHERE id = ?', authorId), 0);
  assert.equal(await count('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?', authorId), 0);
  assert.equal(
    await count('SELECT COUNT(*) AS n FROM points_daily WHERE user_id = ?', authorId),
    0,
  );
  assert.equal(await count('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?', authorId), 0);
  assert.equal(
    await count('SELECT COUNT(*) AS n FROM security_log WHERE user_id = ?', authorId),
    0,
    'plus aucune ligne du journal ne rattache une personne à ce compte',
  );
  assert.equal(
    await count("SELECT COUNT(*) AS n FROM security_log WHERE event = 'account_deleted'"),
    1,
    'la suppression elle-même est journalisée, sans identité',
  );

  // L'e-mail est de nouveau libre
  const again = await h.client().call('POST', '/api/auth/register', {
    acceptTerms: true,
    name: 'Partante',
    email: 'partante@test.bf',
    password: PASSWORD,
    role: 'Étudiant',
  });
  assert.equal(again.status, 201);
});

test('suppression : les erreurs de mot de passe sont limitées', async () => {
  const c = await h.register('Essais', 'essais@test.bf');
  const statuses = [];
  for (let i = 0; i < 8; i++)
    statuses.push(
      (await c.call('POST', '/api/me/delete', { password: `faux-mot-de-passe-${i}` })).status,
    );
  assert.ok(statuses.includes(429), `limite atteinte (${statuses.join(',')})`);
  assert.equal((await c.call('GET', '/api/me')).status, 200, 'le compte est intact');
});

test('suppression : un compte administrateur ne peut pas se supprimer depuis le site', async () => {
  const c = await h.register('Direction', ADMIN_MAIL);
  const res = await c.call('POST', '/api/me/delete', { password: PASSWORD });
  assert.equal(res.status, 403);
  assert.equal((await c.call('GET', '/api/me')).status, 200);
});
