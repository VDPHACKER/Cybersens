// Confirmation d'e-mail : un compte n'est « vérifié » que par la personne qui reçoit le lien.
// Fichier séparé : base temporaire et limites de débit indépendantes des autres tests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { startHarness } from './helpers/apiHarness.mjs';

const ADMIN_MAIL = 'chef@test.bf';
const PASSWORD = 'soleil-riviere-mangue-7';
const GOOGLE_CLIENT = 'client-test-123';

let h;
let setMailTransport;
let resetRateLimits;
const outbox = [];

before(async () => {
  h = await startHarness('email-verif', {
    ADMIN_EMAILS: ADMIN_MAIL,
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT,
    PUBLIC_URL: 'https://cybersens.test',
  });
  ({ setMailTransport } = await import('../server/mail.mjs'));
  ({ resetRateLimits } = await import('../server/api.mjs'));
  setMailTransport(async (mail) => outbox.push(mail));
});
after(async () => {
  setMailTransport(null);
  delete process.env.ADMIN_EMAILS;
  delete process.env.GOOGLE_CLIENT_ID;
  await h.stop();
});

const tokenFrom = (mail) => /[?&]verify=([\w-]+)/.exec(mail?.text ?? '')?.[1];
const lastMailTo = (to) => [...outbox].reverse().find((m) => m.to === to);

// Une seule paire de clés : le serveur garde en cache les clés publiques de Google
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };

const googleLogin = async (email) => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'RS256', kid: 'k1', typ: 'JWT' });
  const claims = enc({
    iss: 'https://accounts.google.com',
    aud: GOOGLE_CLIENT,
    exp: Math.floor(Date.now() / 1000) + 600,
    email,
    email_verified: true,
    name: 'Vraie Personne',
  });
  const sig = crypto
    .sign('RSA-SHA256', Buffer.from(`${head}.${claims}`), privateKey)
    .toString('base64url');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) =>
    String(url).includes('googleapis.com/oauth2')
      ? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
      : realFetch(url, init);
  try {
    const c = h.client();
    const r = await c.call('POST', '/api/auth/google', { credential: `${head}.${claims}.${sig}` });
    return { c, r };
  } finally {
    globalThis.fetch = realFetch;
  }
};

test('inscription : un e-mail de confirmation part et le compte est non vérifié', async () => {
  const c = await h.register('Nouvelle', 'nouvelle@test.bf');
  const me = (await c.call('GET', '/api/me')).data;
  assert.equal(me.user.emailVerified, false);
  assert.equal(me.user.verificationRequired, true);
  const mail = lastMailTo('nouvelle@test.bf');
  assert.ok(mail, 'un e-mail est envoyé à l’adresse saisie');
  assert.match(mail.text, /https:\/\/cybersens\.test\/\?verify=/);
  assert.ok(tokenFrom(mail), 'le lien contient un jeton');
});

test('le lien confirme l’adresse, une seule fois, et un faux jeton est refusé', async () => {
  const c = await h.register('Confirmee', 'confirmee@test.bf');
  const token = tokenFrom(lastMailTo('confirmee@test.bf'));
  assert.equal((await c.call('POST', '/api/auth/verify', { token: 'faux' })).status, 400);
  // Le lien fonctionne même depuis un autre appareil (pas besoin d'être connecté)
  const other = h.client();
  assert.equal((await other.call('POST', '/api/auth/verify', { token })).status, 200);
  assert.equal((await c.call('GET', '/api/me')).data.user.emailVerified, true);
  assert.equal(
    (await other.call('POST', '/api/auth/verify', { token })).status,
    400,
    'usage unique',
  );
});

test('renvoi du lien : limité, et inutile une fois l’adresse confirmée', async () => {
  const c = await h.register('Renvoi', 'renvoi@test.bf');
  const before = outbox.length;
  assert.equal((await c.call('POST', '/api/auth/verify/resend', {})).status, 200);
  assert.equal(outbox.length, before + 1);
  const statuses = [];
  for (let i = 0; i < 5; i++)
    statuses.push((await c.call('POST', '/api/auth/verify/resend', {})).status);
  assert.ok(statuses.includes(429), `le renvoi est limité (${statuses.join(',')})`);
  // L'ancien lien est invalidé par le nouveau
  resetRateLimits('verify-resend');
  const token = tokenFrom(lastMailTo('renvoi@test.bf'));
  assert.equal((await c.call('POST', '/api/auth/verify', { token })).status, 200);
  assert.equal((await c.call('POST', '/api/auth/verify/resend', {})).status, 200);
  assert.equal(
    outbox.filter((m) => m.to === 'renvoi@test.bf').length,
    1 + 1 + statuses.filter((s) => s === 200).length,
  );
});

test('pré-inscription : Google reprend le compte, l’ancien mot de passe et les sessions tombent', async () => {
  // L'attaquant s'inscrit avec l'e-mail de la victime et connaît le mot de passe
  const attacker = await h.register('Pirate', 'victime@test.bf');
  assert.equal((await attacker.call('GET', '/api/me')).status, 200);

  // La victime, qui contrôle réellement la boîte, se connecte avec Google
  const { r } = await googleLogin('victime@test.bf');
  assert.equal(r.status, 200);
  assert.equal(r.data.user.emailVerified, true);

  assert.equal(
    (await attacker.call('GET', '/api/me')).status,
    401,
    'session de l’attaquant révoquée',
  );
  const relog = await h.client().call('POST', '/api/auth/login', {
    email: 'victime@test.bf',
    password: PASSWORD,
  });
  assert.equal(relog.status, 401, 'le mot de passe choisi par l’attaquant ne marche plus');
});

test('Google sur un compte déjà confirmé : le mot de passe et les sessions restent valides', async () => {
  const c = await h.register('Legitime', 'legitime@test.bf');
  await h
    .client()
    .call('POST', '/api/auth/verify', { token: tokenFrom(lastMailTo('legitime@test.bf')) });
  const { r } = await googleLogin('legitime@test.bf');
  assert.equal(r.status, 200);
  assert.equal((await c.call('GET', '/api/me')).status, 200);
  assert.equal(
    (
      await h
        .client()
        .call('POST', '/api/auth/login', { email: 'legitime@test.bf', password: PASSWORD })
    ).status,
    200,
  );
});

test('la réinitialisation par e-mail confirme aussi l’adresse', async () => {
  const c = await h.register('Oubli', 'oubli2@test.bf');
  await h.client().call('POST', '/api/auth/forgot', { email: 'oubli2@test.bf' });
  const token = /\?reset=([\w-]+)/.exec(lastMailTo('oubli2@test.bf').text)?.[1];
  assert.ok(token);
  assert.equal(
    (await h.client().call('POST', '/api/auth/reset', { token, password: 'nouveau-mdp-lune-42' }))
      .status,
    200,
  );
  const again = await h.client().call('POST', '/api/auth/login', {
    email: 'oubli2@test.bf',
    password: 'nouveau-mdp-lune-42',
  });
  assert.equal(again.data.user.emailVerified, true);
  void c;
});

test('administrateur : l’e-mail doit être confirmé avant tout accès au Centre DevOps', async () => {
  const c = await h.register('Chef', ADMIN_MAIL);
  const before = await c.call('GET', '/api/admin/status');
  assert.equal(before.status, 403, 'e-mail non confirmé : accès refusé');
  assert.equal((await c.call('GET', '/api/me')).data.user.isAdmin, false);
  await h.client().call('POST', '/api/auth/verify', { token: tokenFrom(lastMailTo(ADMIN_MAIL)) });
  assert.equal((await c.call('GET', '/api/admin/status')).status, 200);
  assert.equal((await c.call('GET', '/api/me')).data.user.isAdmin, true);
});

test('sans service d’e-mail configuré, rien ne change : comptes utilisables, aucune confirmation exigée', async () => {
  setMailTransport(null);
  try {
    const cfg = (await h.client().call('GET', '/api/auth/config')).data;
    assert.equal(cfg.passwordReset, false);
    const c = await h.register('Sans Mail', 'sansmail@test.bf');
    const me = (await c.call('GET', '/api/me')).data.user;
    assert.equal(me.verificationRequired, false);
    assert.equal((await c.call('POST', '/api/auth/verify/resend', {})).status, 501);
  } finally {
    setMailTransport(async (mail) => outbox.push(mail));
  }
});
