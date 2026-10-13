// Relais Gemini : plafonds quotidiens par compte et pour tout le site, plafond de longueur des réponses.
// Fichier séparé : les seuils sont lus au chargement du module (aucun appel réseau réel).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

process.env.GEMINI_DAILY_PER_USER = '5';
process.env.GEMINI_DAILY_GLOBAL = '8';
process.env.GEMINI_MAX_OUTPUT_TOKENS = '1000';
const { handleGeminiProxy, resetGeminiQuota, resetGeminiHealth } =
  await import('../server/geminiProxy.mjs');

const realFetch = globalThis.fetch;
let upstreamBodies;
beforeEach(() => {
  resetGeminiQuota();
  resetGeminiHealth();
  upstreamBodies = [];
  globalThis.fetch = async (url, init) => {
    upstreamBodies.push(JSON.parse(init.body.toString()));
    return new Response('{"candidates":[]}', { status: 200 });
  };
});

const ask = async (userId, payload = {}) => {
  const req = Readable.from([Buffer.from(JSON.stringify(payload))]);
  Object.assign(req, {
    method: 'POST',
    url: '/api/gemini/v1beta/models/gemini-3.8-flash:generateContent',
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
    end(chunk) {
      if (chunk) out.body += chunk;
    },
  };
  await handleGeminiProxy(req, res, 'cle-de-test', () => ({ id: userId }));
  return out;
};

test('plafond quotidien par compte : le 6e appel de la journée est refusé, les autres comptes passent', async () => {
  // Les limites par minute ne doivent pas masquer le plafond du jour : on reste sous 30 appels/minute.
  for (let i = 0; i < 5; i++) assert.equal((await ask(1)).status, 200);
  const blocked = await ask(1);
  assert.equal(blocked.status, 429);
  assert.match(blocked.body, /aujourd/i, 'le message explique que la limite du jour est atteinte');
  assert.equal((await ask(2)).status, 200, 'un autre compte n’est pas pénalisé');
  assert.equal(upstreamBodies.length, 6, 'le refus n’appelle pas Gemini');
});

test('plafond quotidien global : au-delà, plus personne ne consomme le quota du site', async () => {
  for (let u = 10; u < 18; u++) assert.equal((await ask(u)).status, 200);
  const blocked = await ask(99);
  assert.equal(blocked.status, 503);
  assert.match(blocked.body, /demain|plus tard|capacité/i);
  assert.equal(upstreamBodies.length, 8);
});

test('longueur des réponses plafonnée : valeur absente ou trop grande ramenée au plafond', async () => {
  await ask(20, { contents: [] });
  await ask(21, { contents: [], generationConfig: { maxOutputTokens: 900000, temperature: 0.3 } });
  await ask(22, { contents: [], generationConfig: { maxOutputTokens: 200 } });
  assert.equal(upstreamBodies[0].generationConfig.maxOutputTokens, 1000);
  assert.equal(upstreamBodies[1].generationConfig.maxOutputTokens, 1000);
  assert.equal(
    upstreamBodies[1].generationConfig.temperature,
    0.3,
    'les autres réglages sont conservés',
  );
  assert.equal(
    upstreamBodies[2].generationConfig.maxOutputTokens,
    200,
    'une valeur plus basse est respectée',
  );
});

test('fin de test', () => {
  globalThis.fetch = realFetch;
});
