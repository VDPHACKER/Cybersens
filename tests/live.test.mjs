// Flux temps réel (SSE) : posts de la Communauté et actualités. npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
let awa;
let bob;
const opened = [];

before(async () => {
  h = await startHarness('live');
  awa = await h.register('Awa Traoré', 'awa@test.bf');
  bob = await h.register('Bob Diallo', 'bob@test.bf');
});
after(async () => {
  opened.forEach((s) => s.close());
  await h.stop();
});

const openSse = (cookie) =>
  new Promise((resolve, reject) => {
    const req = http.get(h.BASE + '/api/live/stream', { headers: { Cookie: cookie } }, (res) => {
      const events = [];
      let buf = '';
      let ended = false;
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const ev = /^event: (.+)$/m.exec(block);
          const da = /^data: (.+)$/m.exec(block);
          if (ev && da) events.push({ event: ev[1], data: JSON.parse(da[1]) });
        }
      });
      res.on('close', () => (ended = true));
      const stream = {
        status: res.statusCode,
        events,
        get ended() {
          return ended;
        },
        close: () => req.destroy(),
      };
      opened.push(stream);
      resolve(stream);
    });
    req.on('error', reject);
  });

const waitFor = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  return null;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

test('le flux exige une session', async () => {
  const res = await fetch(h.BASE + '/api/live/stream');
  assert.equal(res.status, 401);
});

test('un post de la Communauté est diffusé aux autres, pas à son auteur', async () => {
  const sAwa = await openSse(awa.cookie);
  const sBob = await openSse(bob.cookie);
  assert.equal(sBob.status, 200);

  const long = 'x'.repeat(200);
  const created = await awa.call('POST', '/api/community/posts', { topic: 'astuce', body: long });
  assert.equal(created.status, 201);

  const got = await waitFor(() => sBob.events.find((e) => e.event === 'community_post'));
  assert.ok(got, 'Bob reçoit la notification');
  assert.equal(got.data.author, 'Awa T.');
  assert.equal(got.data.topic, 'astuce');
  assert.equal(got.data.id, created.data.id);
  assert.equal(got.data.excerpt.length, 80);

  await pause(300);
  assert.equal(sAwa.events.length, 0, 'l’auteur ne reçoit pas sa propre notification');
});

test('au plus 3 connexions par utilisateur : la plus ancienne est fermée', async () => {
  const first = await openSse(bob.cookie); // s'ajoute à celle du test précédent (2)
  await openSse(bob.cookie); // 3
  await openSse(bob.cookie); // 4 → la plus ancienne (du test précédent) est fermée
  const closed = await waitFor(() => opened.filter((s) => s.ended).length >= 1);
  assert.ok(closed, 'une connexion a été fermée');
  assert.equal(first.ended, false, 'les plus récentes restent ouvertes');
});

test('announceNews : un seul événement, 3 articles listés au plus', async () => {
  const { announceNews } = await import('../server/liveFeed.mjs');
  const sAwa = await openSse(awa.cookie);
  const fresh = Array.from({ length: 5 }, (_, i) => ({
    id: `S:${i}`,
    title: `Titre ${i}`,
    source: 'CERT-FR',
    extra: 'ignoré',
  }));
  announceNews(fresh);
  const got = await waitFor(() => sAwa.events.find((e) => e.event === 'news'));
  assert.ok(got);
  assert.equal(got.data.count, 5);
  assert.equal(got.data.items.length, 3);
  assert.deepEqual(Object.keys(got.data.items[0]).sort(), ['id', 'source', 'title']);
});
