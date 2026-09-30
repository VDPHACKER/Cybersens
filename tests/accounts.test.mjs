// Tests des comptes et de la modération : changement de mot de passe, signalements, réinitialisation.
// Fichier séparé : processus, base temporaire et limites de débit indépendants des autres tests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-accounts-'));
process.env.DB_PATH = path.join(tmpDir, 'pglite');

const { handleApi } = await import('../server/api.mjs');
const { closeDb, db } = await import('../server/db.mjs');
const { resetUserPassword, generateTemporaryPassword } = await import('../server/accountTools.mjs');

let server;
let BASE;
let cookie = '';

before(async () => {
  server = http.createServer(async (req, res) => {
    if (!(await handleApi(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const call = async (method, url, body) => {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* pas de corps */
  }
  return { status: res.status, data };
};

const OLD = 'soleil-riviere-mangue-7';
const NEW = 'nuage-ardoise-citron-58';
const register = (name, email) =>
  call('POST', '/api/auth/register', {
    acceptTerms: true,
    name,
    email,
    password: OLD,
    role: 'Professionnel',
  });

test('changement de mot de passe : ancien requis, autres sessions fermées', async () => {
  assert.equal((await register('Chef Test', 'chef@test.bf')).status, 201);

  // Deuxième session (un autre appareil) : elle doit être fermée après le changement
  const other = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'chef@test.bf', password: OLD }),
  });
  const otherCookie = other.headers.get('set-cookie').split(';')[0];
  const meOther = () => fetch(BASE + '/api/me', { headers: { Cookie: otherCookie } });
  assert.equal((await meOther()).status, 200);

  assert.equal(
    (await call('POST', '/api/me/password', { current: 'mauvais-mot-de-passe', next: NEW })).status,
    403,
    'ancien mot de passe exigé',
  );
  assert.equal(
    (await call('POST', '/api/me/password', { current: OLD, next: 'court' })).status,
    400,
    'politique de mot de passe',
  );
  assert.equal(
    (await call('POST', '/api/me/password', { current: OLD, next: OLD })).status,
    400,
    'doit être différent',
  );
  assert.equal(
    (await call('POST', '/api/me/password', { current: OLD, next: 'chef-chef-chef-1234' })).status,
    400,
    'ne doit pas contenir l’e-mail',
  );

  assert.equal((await call('POST', '/api/me/password', { current: OLD, next: NEW })).status, 200);
  assert.equal((await call('GET', '/api/me')).status, 200, 'la session courante reste ouverte');
  assert.equal((await meOther()).status, 401, 'les autres sessions sont fermées');

  await call('POST', '/api/auth/logout');
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'chef@test.bf', password: OLD })).status,
    401,
    'l’ancien mot de passe ne marche plus',
  );
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'chef@test.bf', password: NEW })).status,
    200,
  );
  assert.equal(
    (await call('POST', '/api/me/password', { current: NEW, next: OLD })).status,
    429,
    'limite de 5 tentatives par tranche de 15 minutes',
  );
});

test('communauté : signalement des messages', async () => {
  await call('POST', '/api/auth/logout');
  assert.equal((await register('Membre Deux', 'membre@test.bf')).status, 201);
  const created = await call('POST', '/api/community/posts', {
    body: 'Message à signaler pour le test',
    topic: 'general',
  });
  assert.equal(created.status, 201);
  const postId = created.data.id;
  assert.equal(
    (await call('POST', '/api/community/report', { postId })).status,
    400,
    'on ne signale pas son propre message',
  );

  await call('POST', '/api/auth/logout');
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'chef@test.bf', password: NEW })).status,
    200,
  );
  assert.equal((await call('POST', '/api/community/report', { postId: 999999 })).status, 404);
  assert.equal((await call('POST', '/api/community/report', { postId })).status, 200);
  assert.equal(
    (await call('POST', '/api/community/report', { postId })).status,
    200,
    'idempotent : un seul signalement par membre',
  );

  let feed = await call('GET', '/api/community/posts');
  let post = feed.data.posts.find((p) => p.id === postId);
  assert.equal(post.reportedByMe, true);
  assert.equal(
    post.reports,
    undefined,
    'nombre de signalements invisible pour un membre ordinaire',
  );

  process.env.ADMIN_EMAILS = 'chef@test.bf';
  feed = await call('GET', '/api/community/posts');
  post = feed.data.posts.find((p) => p.id === postId);
  assert.equal(post.reports, 1, 'visible pour un modérateur, sans doublon');
  delete process.env.ADMIN_EMAILS;
});

test('réinitialisation par l’exploitant : mot de passe temporaire, sessions fermées', async () => {
  assert.equal(await resetUserPassword('inconnu@test.bf'), null, 'compte inexistant');
  assert.match(
    generateTemporaryPassword(),
    /^[A-Za-z2-9]{16}$/,
    'alphabet sans caractères ambigus',
  );

  await call('POST', '/api/auth/logout');
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'membre@test.bf', password: OLD })).status,
    200,
  );
  const temporary = await resetUserPassword('  MEMBRE@test.bf ');
  assert.equal(typeof temporary, 'string');
  assert.equal(temporary.length, 16);

  assert.equal((await call('GET', '/api/me')).status, 401, 'les sessions du compte sont fermées');
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'membre@test.bf', password: OLD })).status,
    401,
    'ancien mot de passe invalide',
  );
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'membre@test.bf', password: temporary }))
      .status,
    200,
  );
  const logged = (
    await db
      .prepare("SELECT COUNT(*) AS n FROM security_log WHERE event = 'password_reset_by_operator'")
      .get()
  ).n;
  assert.equal(logged, 1, 'l’opération est journalisée');
});

test('mot de passe oublié : désactivé sans e-mail, puis lien à usage unique', async () => {
  const { setMailTransport } = await import('../server/mail.mjs');
  const cfg = await call('GET', '/api/auth/config');
  assert.equal(cfg.data.passwordReset, false);
  assert.equal((await call('POST', '/api/auth/forgot', { email: 'oubli@test.bf' })).status, 501);

  const outbox = [];
  setMailTransport(async (mail) => outbox.push(mail));
  try {
    assert.equal((await call('GET', '/api/auth/config')).data.passwordReset, true);
    await call('POST', '/api/auth/register', {
      acceptTerms: true,
      name: 'Oubli Test',
      email: 'oubli@test.bf',
      password: OLD,
      role: 'Étudiant',
    });
    await call('POST', '/api/auth/logout');

    // Même réponse que le compte existe ou non ; un seul e-mail part
    const known = await call('POST', '/api/auth/forgot', { email: 'oubli@test.bf', lang: 'en' });
    const unknown = await call('POST', '/api/auth/forgot', { email: 'inconnu@test.bf' });
    assert.deepEqual(known.data, unknown.data);
    assert.equal(outbox.length, 1);
    assert.match(outbox[0].subject, /reset/i);
    const token = /\?reset=([\w-]+)/.exec(outbox[0].text)?.[1];
    assert.ok(token, 'le lien contient le jeton');

    const weak = await call('POST', '/api/auth/reset', { token, password: 'court' });
    assert.equal(weak.status, 400);
    assert.equal(
      (await call('POST', '/api/auth/reset', { token: 'faux', password: NEW })).status,
      400,
    );

    assert.equal((await call('POST', '/api/auth/reset', { token, password: NEW })).status, 200);
    assert.equal(
      (await call('POST', '/api/auth/reset', { token, password: NEW + 'x' })).status,
      400,
      'le lien ne sert qu’une fois',
    );
    assert.equal(
      (await call('POST', '/api/auth/login', { email: 'oubli@test.bf', password: OLD })).status,
      401,
    );
    assert.equal(
      (await call('POST', '/api/auth/login', { email: 'oubli@test.bf', password: NEW })).status,
      200,
    );
  } finally {
    setMailTransport(null);
  }
});

test('connexion Google : signature, audience, expiration et e-mail vérifié contrôlés', async () => {
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { verifyGoogleIdToken } = await import('../server/google.mjs');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  const getKeys = async () => [jwk];
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const make = (claims, key = privateKey) => {
    const head = b64({ alg: 'RS256', kid: 'k1' });
    const body = b64({
      iss: 'https://accounts.google.com',
      aud: 'client-123',
      exp: Math.floor(Date.now() / 1000) + 600,
      email: 'Google.User@Gmail.com',
      email_verified: true,
      name: 'Google User',
      ...claims,
    });
    const sig = sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url');
    return `${head}.${body}.${sig}`;
  };
  const check = (token) => verifyGoogleIdToken(token, { clientId: 'client-123', getKeys });

  assert.deepEqual(await check(make({})), { email: 'google.user@gmail.com', name: 'Google User' });
  await assert.rejects(check(make({ aud: 'autre-client' })), /refusée/);
  await assert.rejects(check(make({ exp: 1 })), /refusée/);
  await assert.rejects(check(make({ email_verified: false })), /refusée/);
  await assert.rejects(check(make({ iss: 'https://evil.example' })), /refusée/);
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  await assert.rejects(check(make({}, other)), /refusée/, 'signature invalide');
  await assert.rejects(check('pas.un.jeton'), /refusée/);

  // Sans GOOGLE_CLIENT_ID, la route est désactivée
  assert.equal((await call('POST', '/api/auth/google', { credential: 'x' })).status, 501);
});
