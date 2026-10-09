// Service worker des notifications push (public/push-sw.js) exécuté dans un environnement simulé. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import webpush from 'web-push';

const ORIGIN = 'https://cybersens.test';
const source = fs.readFileSync(new URL('../public/push-sw.js', import.meta.url), 'utf8');

/** Charge le script dans un faux `self` et retourne ses gestionnaires et les appels observés. */
const loadWorker = ({ windows = [] } = {}) => {
  const handlers = {};
  const calls = { shown: [], opened: [], focused: [], navigated: [] };
  const fakeWindows = windows.map((w) => ({
    ...w,
    focus: async () => calls.focused.push(w.url),
    navigate: async (url) => calls.navigated.push(url),
  }));
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => (handlers[type] = fn),
    clients: {
      matchAll: async () => fakeWindows,
      openWindow: async (url) => calls.opened.push(url),
    },
    registration: {
      showNotification: async (title, options) => calls.shown.push({ title, options }),
    },
  };
  vm.runInNewContext(source, { self, URL, console });
  return { handlers, calls };
};

const run = async (handler, event) => {
  let pending;
  await handler({ ...event, waitUntil: (p) => (pending = p) });
  await pending;
};
const pushEvent = (payload) => ({ data: { json: () => payload } });
const clickEvent = (url) => {
  const closed = [];
  return {
    notification: { data: url === undefined ? undefined : { url }, close: () => closed.push(1) },
    closed,
  };
};

test('push : affiche la notification reçue quand l’application n’est pas visible', async () => {
  const { handlers, calls } = loadWorker({
    windows: [{ url: ORIGIN + '/', visibilityState: 'hidden' }],
  });
  await run(
    handlers.push,
    pushEvent({
      title: 'Communauté CyberSens',
      body: 'Awa T. a publié',
      url: '/?tab=community',
      tag: 'community',
    }),
  );
  assert.equal(calls.shown.length, 1);
  assert.equal(calls.shown[0].title, 'Communauté CyberSens');
  assert.equal(calls.shown[0].options.body, 'Awa T. a publié');
  assert.equal(calls.shown[0].options.tag, 'community');
  assert.equal(calls.shown[0].options.data.url, ORIGIN + '/?tab=community');
});

test('push : rien n’est affiché si l’application est visible ET au premier plan (le toast interne suffit)', async () => {
  const { handlers, calls } = loadWorker({
    windows: [{ url: ORIGIN + '/', visibilityState: 'visible', focused: true }],
  });
  await run(handlers.push, pushEvent({ title: 'X', body: 'Y' }));
  assert.equal(calls.shown.length, 0);
});

test('push : fenêtre visible mais cachée derrière une autre appli (sans focus) : la notification s’affiche', async () => {
  const { handlers, calls } = loadWorker({
    windows: [{ url: ORIGIN + '/', visibilityState: 'visible', focused: false }],
  });
  await run(
    handlers.push,
    pushEvent({ title: 'Communauté', body: 'Nouveau message', tag: 'community' }),
  );
  assert.equal(calls.shown.length, 1);
  // Comme WhatsApp : chaque nouveau message alerte de nouveau, sans empiler de doublons
  assert.equal(calls.shown[0].options.renotify, true);
  assert.deepEqual([...calls.shown[0].options.vibrate], [120, 60, 120]);
  assert.equal(typeof calls.shown[0].options.timestamp, 'number');
});

test('push : sans étiquette, pas de « renotify » (le navigateur refuserait la notification)', async () => {
  const { handlers, calls } = loadWorker();
  await run(handlers.push, pushEvent({ title: 'X', body: 'Y' }));
  assert.equal(calls.shown[0].options.tag, undefined);
  assert.equal(calls.shown[0].options.renotify, false);
});

test('push : charge utile absente ou invalide, textes bornés, adresse étrangère neutralisée', async () => {
  const { handlers, calls } = loadWorker();
  await run(handlers.push, { data: null });
  await run(handlers.push, {
    data: {
      json: () => {
        throw new Error('json');
      },
    },
  });
  assert.equal(calls.shown.length, 2);
  assert.equal(calls.shown[0].title, 'CyberSens');

  await run(
    handlers.push,
    pushEvent({ title: 't'.repeat(500), body: 'b'.repeat(500), url: 'https://evil.example/phish' }),
  );
  const last = calls.shown[2];
  assert.equal(last.title.length, 100);
  assert.equal(last.options.body.length, 240);
  assert.equal(last.options.data.url, ORIGIN + '/');
});

test('clic : ferme la notification et ouvre l’application, ou réutilise la fenêtre ouverte', async () => {
  const closed = loadWorker();
  const click1 = clickEvent(ORIGIN + '/?tab=news');
  await run(closed.handlers.notificationclick, click1);
  assert.equal(click1.closed.length, 1);
  assert.deepEqual(closed.calls.opened, [ORIGIN + '/?tab=news']);

  const open = loadWorker({ windows: [{ url: ORIGIN + '/profile', visibilityState: 'hidden' }] });
  await run(open.handlers.notificationclick, clickEvent(ORIGIN + '/?tab=community'));
  assert.equal(open.calls.focused.length, 1);
  assert.deepEqual(open.calls.navigated, [ORIGIN + '/?tab=community']);
  assert.equal(open.calls.opened.length, 0);
});

test('clic : adresse étrangère ou absente ramenée à l’accueil du site', async () => {
  for (const url of ['https://evil.example/x', 'javascript:alert(1)', undefined]) {
    const w = loadWorker();
    await run(w.handlers.notificationclick, clickEvent(url));
    assert.deepEqual(w.calls.opened, [ORIGIN + '/'], String(url));
  }
});

test('envoi réel : requête Web Push chiffrée et signée VAPID (sans réseau)', async () => {
  const receiver = crypto.createECDH('prime256v1');
  receiver.generateKeys();
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: {
      p256dh: receiver.getPublicKey().toString('base64url'),
      auth: crypto.randomBytes(16).toString('base64url'),
    },
  };
  const vapid = webpush.generateVAPIDKeys();
  webpush.setVapidDetails('mailto:admin@test.bf', vapid.publicKey, vapid.privateKey);
  const details = webpush.generateRequestDetails(
    subscription,
    JSON.stringify({ title: 'Test', body: 'Bonjour' }),
    { TTL: 86400, urgency: 'normal' },
  );
  assert.equal(details.method, 'POST');
  assert.equal(details.endpoint, subscription.endpoint);
  assert.match(details.headers.Authorization, /^vapid t=.+, k=.+$/);
  assert.equal(details.headers.TTL, 86400);
  assert.equal(details.headers['Content-Encoding'], 'aes128gcm');
  assert.ok(Buffer.isBuffer(details.body) && details.body.length > 40);
  assert.ok(!details.body.toString('latin1').includes('Bonjour'), 'charge utile chiffrée');
});
