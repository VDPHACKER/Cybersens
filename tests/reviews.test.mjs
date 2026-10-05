// Avis des utilisateurs et nombre de membres : npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
let awa;
let bob;
before(async () => {
  h = await startHarness('reviews', { ADMIN_EMAILS: 'admin@test.bf' });
});
after(async () => {
  await h.stop();
});

test('GET /api/reviews est public : vide au départ, compte les membres', async () => {
  const anon = h.client();
  let r = await anon.call('GET', '/api/reviews');
  assert.equal(r.status, 200);
  assert.deepEqual(
    {
      count: r.data.count,
      average: r.data.average,
      reviews: r.data.reviews,
      members: r.data.members,
    },
    { count: 0, average: 0, reviews: [], members: 0 },
  );
  awa = await h.register('Awa Traoré', 'awa@test.bf');
  r = await anon.call('GET', '/api/reviews');
  assert.equal(r.data.members, 1);
});

test('POST /api/reviews : authentification et validation', async () => {
  const anon = h.client();
  assert.equal(
    (await anon.call('POST', '/api/reviews', { rating: 5, body: 'Très bonne plateforme.' })).status,
    401,
  );
  const text = 'Très bonne plateforme.';
  for (const rating of [0, 6, 3.5, '5', null]) {
    const r = await awa.call('POST', '/api/reviews', { rating, body: text });
    assert.equal(r.status, 400, `note ${JSON.stringify(rating)} refusée`);
  }
  assert.equal((await awa.call('POST', '/api/reviews', { rating: 5, body: 'court' })).status, 400);
  assert.equal(
    (await awa.call('POST', '/api/reviews', { rating: 5, body: 'x'.repeat(501) })).status,
    400,
  );
  assert.equal((await awa.call('GET', '/api/reviews/mine')).data.review, null);
});

test('un seul avis par compte (mise à jour) et moyenne', async () => {
  bob = await h.register('Bob Diallo', 'bob@test.bf');
  assert.equal(
    (
      await awa.call('POST', '/api/reviews', {
        rating: 5,
        body: 'Excellente plateforme pour apprendre.',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await awa.call('POST', '/api/reviews', {
        rating: 4,
        body: 'Excellente plateforme, mise à jour.',
      })
    ).status,
    200,
  );
  assert.equal(
    (await bob.call('POST', '/api/reviews', { rating: 3, body: 'Utile mais quelques bugs.' }))
      .status,
    200,
  );

  const mine = (await awa.call('GET', '/api/reviews/mine')).data.review;
  assert.equal(mine.rating, 4);
  assert.equal(mine.body, 'Excellente plateforme, mise à jour.');

  const r = await h.client().call('GET', '/api/reviews');
  assert.equal(r.data.count, 2);
  assert.equal(r.data.average, 3.5);
  assert.equal(r.data.reviews[0].author, 'Bob D.', 'le plus récent en premier, nom abrégé');
  assert.ok(!('email' in r.data.reviews[0]) && !('userId' in r.data.reviews[0]));
});

test('un texte HTML est stocké et renvoyé tel quel (échappé à l’affichage)', async () => {
  const carol = await h.register('Carol Sy', 'carol@test.bf');
  const html = '<script>alert(1)</script> super formation';
  assert.equal((await carol.call('POST', '/api/reviews', { rating: 5, body: html })).status, 200);
  const r = await h.client().call('GET', '/api/reviews');
  assert.equal(r.data.reviews[0].body, html);
  assert.equal(r.data.count, 3);
  assert.equal(r.data.average, 4);
});

test('suppression : son avis, par un admin, interdite aux autres', async () => {
  const anon = h.client();
  const list = (await anon.call('GET', '/api/reviews')).data.reviews;
  const carolId = list.find((x) => x.author === 'Carol S.').id;
  const bobId = list.find((x) => x.author === 'Bob D.').id;

  assert.equal((await bob.call('DELETE', `/api/reviews?id=${carolId}`)).status, 403);
  assert.equal((await awa.call('DELETE', '/api/reviews')).status, 200);
  assert.equal((await anon.call('GET', '/api/reviews')).data.count, 2);

  const admin = await h.register('Admin Test', 'admin@test.bf');
  assert.equal((await admin.call('DELETE', '/api/reviews?id=999999')).status, 404);
  assert.equal((await admin.call('DELETE', `/api/reviews?id=${bobId}`)).status, 200);
  assert.equal((await anon.call('GET', '/api/reviews')).data.count, 1);
});
