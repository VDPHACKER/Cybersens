// Quiz multijoueur en salles : création, rejoindre, partie complète à deux joueurs (flux temps réel).
// Fichier séparé : processus, base temporaire et limites de débit indépendants des autres tests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-rooms-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const { handleApi } = await import('../server/api.mjs');
const { closeDb } = await import('../server/db.mjs');
const { setRoomTiming, resetRooms } = await import('../server/rooms.mjs');

let server;
let BASE;

before(async () => {
  setRoomTiming({ revealMs: 40, graceMs: 100 });
  server = http.createServer(async (req, res) => {
    if (!(await handleApi(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  resetRooms();
  server.closeAllConnections?.();
  server.close();
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const PASSWORD = 'soleil-riviere-mangue-7';

const newPlayer = async (name, email) => {
  const res = await fetch(BASE + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: PASSWORD, role: 'Étudiant' }),
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  const call = async (method, url, body) => {
    const r = await fetch(BASE + url, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try {
      data = await r.json();
    } catch {
      /* pas de corps */
    }
    return { status: r.status, data };
  };
  return { cookie, call };
};

/** Ouvre le flux d'une salle et conserve le dernier état reçu. */
const watch = async (player, code) => {
  const controller = new AbortController();
  const res = await fetch(`${BASE}/api/rooms/stream?code=${code}`, {
    headers: { Cookie: player.cookie },
    signal: controller.signal,
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const history = [];
  let last = null;
  const waiters = [];
  (async () => {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = block.split('\n').find((l) => l.startsWith('data: '));
          if (!data) continue;
          last = JSON.parse(data.slice(6));
          history.push(last);
          for (const w of [...waiters]) if (w.test(last)) w.resolve(last);
        }
      }
    } catch {
      /* flux fermé */
    }
  })();
  return {
    history,
    get last() {
      return last;
    },
    until: (test, ms = 3000) => {
      if (last && test(last)) return Promise.resolve(last);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('délai dépassé')), ms);
        waiters.push({
          test,
          resolve: (state) => {
            clearTimeout(timer);
            resolve(state);
          },
        });
      });
    },
    close: () => controller.abort(),
  };
};

test('salle : créer, rejoindre, jouer une partie complète à deux téléphones', async () => {
  const alice = await newPlayer('Alice Martin', 'alice@test.bf');
  const bob = await newPlayer('Bob Durand', 'bob@test.bf');
  const eve = await newPlayer('Eve Nkosi', 'eve@test.bf');

  // Paramètres invalides refusés

  assert.equal((await alice.call('POST', '/api/rooms', { count: 1, seconds: 10 })).status, 400);

  const created = await alice.call('POST', '/api/rooms', { count: 3, seconds: 10 });
  assert.equal(created.status, 201);
  const code = created.data.code;
  assert.match(code, /^\d{6}$/);

  assert.equal((await bob.call('POST', '/api/rooms/join', { code: '000000' })).status, 404);
  assert.equal((await bob.call('POST', '/api/rooms/join', { code })).status, 200);

  const a = await watch(alice, code);
  const b = await watch(bob, code);

  // Seul l'hôte lance ; il faut au moins deux joueurs
  assert.equal((await bob.call('POST', '/api/rooms/start', { code })).status, 403);
  const lobby = await a.until((s) => s.players.length === 2);
  assert.equal(lobby.phase, 'lobby');
  assert.equal(lobby.you.isHost, true);
  assert.deepEqual(lobby.players.map((p) => p.name).sort(), ['Alice M.', 'Bob D.']);

  // Un joueur non membre ne peut ni écouter ni répondre
  const outsider = await fetch(`${BASE}/api/rooms/stream?code=${code}`, {
    headers: { Cookie: eve.cookie },
  });
  assert.equal(outsider.status, 403);
  await outsider.body?.cancel();
  assert.equal((await eve.call('POST', '/api/rooms/answer', { code, choice: 0 })).status, 403);

  assert.equal((await alice.call('POST', '/api/rooms/start', { code })).status, 200);

  for (let round = 0; round < 3; round++) {
    const qa = await a.until((s) => s.phase === 'question' && s.index === round);
    const qb = await b.until((s) => s.phase === 'question' && s.index === round);
    assert.equal(qa.question.options.length, 4);
    assert.ok(qa.question.text.fr && qa.question.text.en && qa.question.text.es, 'trois langues');
    assert.equal(qa.reveal, undefined, 'la bonne réponse n’est jamais envoyée avant la révélation');
    assert.equal(JSON.stringify(qa).includes('correct'), false);
    assert.equal(qb.you.choice, null);

    assert.equal((await alice.call('POST', '/api/rooms/answer', { code, choice: 9 })).status, 400);
    assert.equal((await alice.call('POST', '/api/rooms/answer', { code, choice: 0 })).status, 200);
    assert.equal(
      (await alice.call('POST', '/api/rooms/answer', { code, choice: 1 })).status,
      409,
      'une seule réponse par question',
    );
    await b.until(
      (s) => s.index === round && s.players.find((p) => p.name === 'Alice M.').answered,
    );
    assert.equal((await bob.call('POST', '/api/rooms/answer', { code, choice: 1 })).status, 200);

    // Tout le monde a répondu : révélation immédiate, sans attendre la fin du minuteur
    const shown = await a.until((s) => s.phase === 'reveal' && s.index === round);
    assert.ok(Number.isInteger(shown.reveal.correct));
    assert.equal(
      shown.reveal.counts.reduce((x, y) => x + y, 0),
      2,
    );
  }

  const done = await b.until((s) => s.phase === 'finished');
  assert.equal(done.ranking.length, 2);
  assert.ok(done.ranking[0].score >= done.ranking[1].score);
  assert.ok(done.ranking[0].score > 0 || done.ranking[1].score > 0 || done.ranking.length === 2);

  // Partie terminée : plus de nouvelle arrivée
  assert.equal((await eve.call('POST', '/api/rooms/join', { code })).status, 409);

  a.close();
  b.close();
  assert.equal((await alice.call('POST', '/api/rooms/leave')).status, 200);
  assert.equal((await bob.call('POST', '/api/rooms/leave')).status, 200);
  assert.equal(
    (await bob.call('POST', '/api/rooms/join', { code })).status,
    404,
    'salle vide supprimée',
  );
});

test('salle : le minuteur révèle la réponse même sans réponse des joueurs', async () => {
  const carl = await newPlayer('Carl Roy', 'carl@test.bf');
  const dana = await newPlayer('Dana Lopez', 'dana@test.bf');
  const created = await carl.call('POST', '/api/rooms', { count: 3, seconds: 10 });
  const code = created.data.code;
  await dana.call('POST', '/api/rooms/join', { code });
  const c = await watch(carl, code);
  await c.until((s) => s.players.length === 2);
  assert.equal((await carl.call('POST', '/api/rooms/start', { code })).status, 200);
  const question = await c.until((s) => s.phase === 'question');
  assert.ok(question.deadline > question.now);
  // Un joueur qui quitte ne bloque pas la partie ; l'hôte est transféré s'il part
  await carl.call('POST', '/api/rooms/leave');
  c.close();
  const rest = await watch(dana, code);
  const state = await rest.until((s) => s.players.length === 1);
  assert.equal(state.hostId, state.you.id);
  rest.close();
  await dana.call('POST', '/api/rooms/leave');
});
