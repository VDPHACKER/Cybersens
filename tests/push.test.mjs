// Notifications Web Push : abonnements, filtrage des destinations, envoi à la publication. npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
let awa;
let bob;
const sent = [];
let failWith = null;

const P256DH = 'B'.repeat(87);
const AUTH = 'a'.repeat(22);
const sub = (id) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  keys: { p256dh: P256DH, auth: AUTH },
});

const waitFor = async (check, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
};

let push;
let db;
before(async () => {
  h = await startHarness('push', { ADMIN_EMAILS: 'admin@test.bf' });
  push = await import('../server/push.mjs');
  db = (await import('../server/db.mjs')).db;
  push.setPushSender(async (subscription, payload, options) => {
    if (failWith) {
      const err = new Error('gone');
      err.statusCode = failWith;
      throw err;
    }
    sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload), options });
  });
  awa = await h.register('Awa Traoré', 'awa@test.bf');
  bob = await h.register('Bob Diallo', 'bob@test.bf');
});
after(async () => {
  await h.stop();
});

test('clé publique : réservée aux membres connectés', async () => {
  const anonymous = h.client();
  assert.equal((await anonymous.call('GET', '/api/push/key')).status, 401);
  const r = await awa.call('GET', '/api/push/key');
  assert.equal(r.status, 200);
  assert.equal(r.data.configured, true);
  assert.match(r.data.publicKey, /^[A-Za-z0-9_-]{80,100}$/);
  // La paire est conservée : même clé à chaque demande
  assert.equal((await bob.call('GET', '/api/push/key')).data.publicKey, r.data.publicKey);
});

test('abonnement : seules les destinations des vrais services de push sont acceptées (anti-SSRF)', async () => {
  const bad = [
    'http://fcm.googleapis.com/fcm/send/x',
    'https://127.0.0.1/hook',
    'https://localhost/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://fcm.googleapis.com.evil.example/x',
    'https://evil.example/?u=https://fcm.googleapis.com/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'pas une url',
  ];
  for (const endpoint of bad) {
    const r = await awa.call('POST', '/api/push/subscribe', { ...sub('x'), endpoint });
    assert.equal(r.status, 400, endpoint);
  }
  const badKeys = await awa.call('POST', '/api/push/subscribe', {
    endpoint: sub('x').endpoint,
    keys: { p256dh: 'court', auth: AUTH },
  });
  assert.equal(badKeys.status, 400);
  for (const endpoint of [
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])
    assert.equal(push.isAllowedEndpoint(endpoint), true, endpoint);
});

test('abonnement : enregistré, transféré au dernier compte connecté, supprimé par son propriétaire', async () => {
  assert.equal(
    (await awa.call('POST', '/api/push/subscribe', { ...sub('awa-1'), lang: 'fr' })).status,
    200,
  );
  assert.equal(
    (await bob.call('POST', '/api/push/subscribe', { ...sub('bob-1'), lang: 'en' })).status,
    200,
  );
  assert.equal((await h.client().call('POST', '/api/push/subscribe', sub('anon'))).status, 401);

  // Bob ne peut pas supprimer l'abonnement d'Awa
  await bob.call('POST', '/api/push/unsubscribe', { endpoint: sub('awa-1').endpoint });
  assert.equal(await push.countSubscriptions(), 2);

  // Même appareil, autre compte : l'abonnement change de propriétaire au lieu de se dupliquer
  await bob.call('POST', '/api/push/subscribe', sub('awa-1'));
  assert.equal(await push.countSubscriptions(), 2);
  await awa.call('POST', '/api/push/subscribe', sub('awa-1'));

  await bob.call('POST', '/api/push/unsubscribe', { endpoint: sub('bob-1').endpoint });
  assert.equal(await push.countSubscriptions(), 1);
  await bob.call('POST', '/api/push/subscribe', { ...sub('bob-1'), lang: 'en' });
});

test('publication dans la Communauté : push aux autres membres, dans leur langue, pas à l’auteur', async () => {
  sent.length = 0;
  const r = await awa.call('POST', '/api/community/posts', {
    topic: 'general',
    body: 'Attention à ce faux SMS de livraison reçu ce matin',
  });
  assert.equal(r.status, 201);
  await waitFor(() => sent.length >= 1);
  assert.equal(sent.length, 1, 'un seul destinataire : Bob');
  assert.equal(sent[0].endpoint, sub('bob-1').endpoint);
  assert.equal(sent[0].payload.title, 'CyberSens Community');
  assert.match(sent[0].payload.body, /Awa T\. posted: “Attention/);
  assert.equal(sent[0].payload.url, '/?tab=community');
  assert.equal(sent[0].options.TTL, 24 * 3600);
});

test('actualités et annonces : push à tous les abonnés', async () => {
  sent.length = 0;
  const { announceNews } = await import('../server/liveFeed.mjs');
  announceNews([{ id: 'a', title: 'Faille critique dans un routeur', source: 'CERT-FR' }]);
  await waitFor(() => sent.length >= 2);
  assert.equal(sent.length, 2);
  const fr = sent.find((s) => s.endpoint === sub('awa-1').endpoint);
  assert.equal(fr.payload.title, 'Actualité cyber');
  assert.equal(fr.payload.body, 'Faille critique dans un routeur');
  assert.equal(fr.payload.url, '/?tab=news');
});

test('abonnement expiré (410) : supprimé automatiquement, autres erreurs conservées', async () => {
  failWith = 500;
  let stats = await push.pushToAll(push.announcementPush({ title: 'Test', body: 'Message' }));
  assert.deepEqual(stats, { sent: 0, removed: 0, failed: 2 });
  assert.equal(await push.countSubscriptions(), 2);
  failWith = 410;
  stats = await push.pushToAll(push.announcementPush({ title: 'Test', body: 'Message' }));
  assert.equal(stats.removed, 2);
  assert.equal(await push.countSubscriptions(), 0);
  failWith = null;
});

test('déconnexion : l’appareil est désabonné du compte', async () => {
  const carl = await h.register('Carl Ouédraogo', 'carl@test.bf');
  await carl.call('POST', '/api/push/subscribe', sub('carl-1'));
  assert.equal(await push.countSubscriptions(), 1);
  const out = await carl.call('POST', '/api/auth/logout', { endpoint: sub('carl-1').endpoint });
  assert.equal(out.status, 200);
  assert.equal(await push.countSubscriptions(), 0);
});

test('annonce aux membres : réservée aux administrateurs', async () => {
  const r = await awa.call('POST', '/api/admin/announce', {
    title: 'Nouveau',
    body: 'Un nouveau module',
  });
  assert.equal(r.status, 403);
  assert.equal((await h.client().call('POST', '/api/admin/announce', {})).status, 401);
});

test('suppression d’un compte : ses abonnements disparaissent avec lui', async () => {
  const dana = await h.register('Dana Sawadogo', 'dana@test.bf');
  await dana.call('POST', '/api/push/subscribe', sub('dana-1'));
  assert.equal(await push.countSubscriptions(), 1);
  await db.prepare("DELETE FROM users WHERE email = 'dana@test.bf'").run();
  assert.equal(await push.countSubscriptions(), 0);
});
