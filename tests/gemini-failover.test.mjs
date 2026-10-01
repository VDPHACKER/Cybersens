// Relais Gemini : bascule rapide vers un modèle de secours (aucun appel réseau réel).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

process.env.GEMINI_HEADER_TIMEOUT_MS = '150';
process.env.GEMINI_FALLBACK_MODELS = 'secours-a,secours-b';
const { handleGeminiProxy, resetGeminiHealth } = await import('../server/geminiProxy.mjs');

const realFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  resetGeminiHealth();
  calls = [];
});

const mockUpstream = (behaviors) => {
  globalThis.fetch = async (url, init) => {
    const model = /models\/([^:]+):/.exec(String(url))[1];
    calls.push(model);
    const b = behaviors[model] ?? { status: 200 };
    if (b.hang)
      await new Promise((_, reject) =>
        init.signal.addEventListener('abort', () =>
          reject(new DOMException('abort', 'AbortError')),
        ),
      );
    return new Response(b.status === 200 ? '{"ok":"' + model + '"}' : '{}', { status: b.status });
  };
};

const ask = async (method = 'streamGenerateContent') => {
  const req = Readable.from([Buffer.from('{}')]);
  Object.assign(req, {
    method: 'POST',
    url: `/api/gemini/v1beta/models/gemini-3.8-flash:${method}`,
    headers: { 'content-type': 'application/json', host: 'x' },
    socket: { remoteAddress: '10.0.0.1' },
  });
  const out = { status: 0, body: '' };
  const res = {
    headersSent: false,
    setHeader() {},
    writeHead(code) {
      out.status = code;
    },
    write(chunk) {
      out.body += Buffer.from(chunk).toString();
    },
    end() {},
  };
  await handleGeminiProxy(req, res, 'cle-de-test', () => ({ id: 1 }));
  return out;
};

test('modèle principal saturé (503) : bascule sans attente fixe, puis modèle ignoré', async () => {
  mockUpstream({ 'gemini-3.8-flash': { status: 503 } });
  const t0 = Date.now();
  const first = await ask();
  assert.equal(first.status, 200);
  assert.match(first.body, /secours-a/);
  assert.deepEqual(calls, ['gemini-3.8-flash', 'secours-a'], 'un seul essai du modèle saturé');
  assert.ok(Date.now() - t0 < 700, 'plus de pause de 800 ms avant le deuxième essai');

  calls.length = 0;
  const second = await ask();
  assert.equal(second.status, 200);
  assert.deepEqual(calls, ['secours-a'], 'le modèle saturé est ignoré pendant la pause');
});

test('modèle supprimé (404) : on passe au suivant', async () => {
  mockUpstream({ 'gemini-3.8-flash': { status: 404 }, 'secours-a': { status: 404 } });
  const res = await ask();
  assert.equal(res.status, 200);
  assert.match(res.body, /secours-b/);
  assert.deepEqual(calls, ['gemini-3.8-flash', 'secours-a', 'secours-b']);
});

test('modèle trop lent en streaming : abandonné après le délai, secours utilisé', async () => {
  mockUpstream({ 'gemini-3.8-flash': { hang: true } });
  const t0 = Date.now();
  const res = await ask();
  const elapsed = Date.now() - t0;
  assert.equal(res.status, 200);
  assert.match(res.body, /secours-a/);
  assert.ok(elapsed >= 140 && elapsed < 1500, `bascule après le délai (${elapsed} ms)`);
});

test('sans streaming, le délai avant le premier octet est plus long', async () => {
  // Délai de 150 ms en streaming, 750 ms sans : une réponse à 300 ms n'est pas coupée
  globalThis.fetch = async (url) => {
    calls.push(/models\/([^:]+):/.exec(String(url))[1]);
    await new Promise((r) => setTimeout(r, 300));
    return new Response('{"ok":"principal"}', { status: 200 });
  };
  const res = await ask('generateContent');
  assert.equal(res.status, 200);
  assert.match(res.body, /principal/);
  assert.deepEqual(calls, ['gemini-3.8-flash']);
});

test('tous les modèles en échec : l’erreur du fournisseur est renvoyée', async () => {
  mockUpstream({
    'gemini-3.8-flash': { status: 503 },
    'secours-a': { status: 503 },
    'secours-b': { status: 503 },
  });
  const res = await ask();
  assert.equal(res.status, 503);
  assert.equal(calls.length, 3);
});

test.after(() => {
  globalThis.fetch = realFetch;
});
