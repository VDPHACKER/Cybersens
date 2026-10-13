// Verrouillage de connexion : un inconnu ne doit pas pouvoir bloquer le vrai propriétaire du compte.
// Les requêtes sont simulées avec des adresses IP différentes (le serveur de test n'en a qu'une).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { startHarness } from './helpers/apiHarness.mjs';

const PASSWORD = 'soleil-riviere-mangue-7';
const VICTIM = 'victime-verrou@test.bf';

let h;
let handleApi;
before(async () => {
  h = await startHarness('lockout');
  ({ handleApi } = await import('../server/api.mjs'));
  await h.register('Victime Verrou', VICTIM);
});
after(async () => {
  await h.stop();
});

const loginFrom = async (ip, password) => {
  const req = Readable.from([Buffer.from(JSON.stringify({ email: VICTIM, password }))]);
  Object.assign(req, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'content-type': 'application/json', host: 'x' },
    socket: { remoteAddress: ip },
  });
  const out = { status: 0, body: '' };
  const res = {
    headersSent: false,
    setHeader() {},
    writeHead(code) {
      out.status = code;
    },
    write() {},
    end(chunk) {
      if (chunk) out.body += chunk;
    },
  };
  await handleApi(req, res);
  return out;
};

test('un inconnu qui échoue 5 fois est bloqué lui-même, pas le propriétaire connecté d’ailleurs', async () => {
  for (let i = 0; i < 5; i++)
    assert.equal((await loginFrom('203.0.113.7', `faux-${i}`)).status, 401);
  assert.equal(
    (await loginFrom('203.0.113.7', PASSWORD)).status,
    429,
    'l’adresse qui a échoué est bloquée, même avec le bon mot de passe',
  );
  assert.equal(
    (await loginFrom('198.51.100.20', PASSWORD)).status,
    200,
    'le propriétaire, depuis une autre adresse, se connecte normalement',
  );
});

test('une attaque répartie sur de nombreuses adresses finit tout de même par bloquer le compte', async () => {
  for (let i = 1; i <= 25; i++)
    assert.equal((await loginFrom(`192.0.2.${i}`, `faux-${i}`)).status, 401);
  assert.equal(
    (await loginFrom('198.51.100.99', PASSWORD)).status,
    429,
    'au-delà du seuil global par compte, plus aucune tentative ne passe pendant le blocage',
  );
});
