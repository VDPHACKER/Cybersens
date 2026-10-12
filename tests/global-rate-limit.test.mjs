// Limite globale de requêtes par adresse IP, appliquée à toute l'API avant même la recherche de la route.
// Fichier séparé : la limite est lue au chargement du module, avec un seuil bas propre à ce test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
before(async () => {
  h = await startHarness('global-rate', { API_RATE_LIMIT_PER_MIN: '25' });
});
after(async () => {
  await h.stop();
});

test('au-delà du seuil par minute, toute l’API répond 429 avec Retry-After', async () => {
  const statuses = [];
  let last;
  for (let i = 0; i < 40; i++) {
    last = await fetch(`${h.BASE}/api/health`);
    statuses.push(last.status);
  }
  const firstBlocked = statuses.indexOf(429);
  assert.ok(firstBlocked > 0, `une requête doit finir bloquée (statuts : ${statuses.join(',')})`);
  assert.ok(
    firstBlocked <= 25,
    `blocage au plus tard à la 26e requête (obtenu : ${firstBlocked + 1})`,
  );
  assert.ok(
    statuses.slice(firstBlocked).every((s) => s === 429),
    'une fois bloquée, l’adresse reste bloquée jusqu’à la fin de la fenêtre',
  );
  assert.ok(Number(last.headers.get('retry-after')) >= 1, 'en-tête Retry-After présent');
  // Les routes inconnues comptent aussi : un scanner qui sonde des URL ne passe pas à travers.
  assert.equal((await fetch(`${h.BASE}/api/n-importe-quoi`)).status, 429);
});
