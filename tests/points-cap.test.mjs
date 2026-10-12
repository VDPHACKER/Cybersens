// Points déclarés par le navigateur : plafonds par activité et par jour, plafond de la migration locale.
// Fichier séparé : base temporaire et limites de débit indépendantes des autres tests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
before(async () => {
  h = await startHarness('points-cap');
});
after(async () => {
  await h.stop();
});

const granter = (c) => async (delta, source) =>
  (await c.call('POST', '/api/me/points', { delta, source })).data.granted;

test('plafond par activité : un jeu ne peut pas rapporter plus de 250 points par jour', async () => {
  const grant = granter(await h.register('Joueur', 'joueur@test.bf'));
  assert.equal(await grant(200, 'game'), 200);
  assert.equal(await grant(200, 'game'), 50);
  assert.equal(await grant(200, 'game'), 0);
});

test('sans activité reconnue, le plafond est de 400 points par jour (omettre la source ne contourne rien)', async () => {
  const grant = granter(await h.register('Sans source', 'sansource@test.bf'));
  assert.equal(await grant(200, undefined), 200);
  assert.equal(await grant(200, 'inconnue'), 200);
  assert.equal(await grant(200, undefined), 0);
});

test('plafond global : 600 points par jour toutes activités confondues', async () => {
  const c = await h.register('Marathon', 'marathon@test.bf');
  const grant = granter(c);
  const granted = [
    await grant(200, 'game'),
    await grant(50, 'game'),
    await grant(150, 'deepfake'),
    await grant(150, 'lab'),
    await grant(200, 'practice'), // plafond d'activité 60, mais il ne reste que 50 sur le jour
    await grant(10, 'practice'),
    await grant(10, undefined),
  ];
  assert.deepEqual(granted, [200, 50, 150, 150, 50, 0, 0]);
  assert.equal((await c.call('GET', '/api/me')).data.user.points, 600);
});

test('requêtes simultanées : le plafond tient même si 20 demandes arrivent en même temps', async () => {
  const c = await h.register('Rafale', 'rafale@test.bf');
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      c.call('POST', '/api/me/points', { delta: 200, source: 'game' }),
    ),
  );
  const total = results.reduce((sum, r) => sum + (r.data?.granted ?? 0), 0);
  assert.equal(total, 250, `250 points au plus pour le jeu (obtenu : ${total})`);
  assert.equal((await c.call('GET', '/api/me')).data.user.points, 250);
});

test('migration des données locales : points importés plafonnés à 1000, une seule fois', async () => {
  const c = await h.register('Ancien', 'ancien@test.bf');
  const mig = await c.call('POST', '/api/migrate', { points: 999999 });
  assert.equal(mig.data.user.points, 1000);
  assert.equal((await c.call('POST', '/api/migrate', { points: 5000 })).data.user.points, 1000);
});
