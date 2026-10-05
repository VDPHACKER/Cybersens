// Fusion des nouveaux posts dans le fil déjà affiché. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNewPosts } from '../services/communityMerge.ts';

const post = (id) => ({ id, body: `post ${id}` });

test('les nouveaux posts s’ajoutent en tête, sans toucher à la suite déjà chargée', () => {
  const shown = [post(50), post(49), post(10)]; // l'utilisateur a chargé plus bas via « Voir plus »
  const firstPage = [post(52), post(51), post(50), post(49)];
  assert.deepEqual(
    mergeNewPosts(shown, firstPage).map((p) => p.id),
    [52, 51, 50, 49, 10],
  );
});

test('rien de nouveau : la liste est inchangée (même contenu)', () => {
  const shown = [post(3), post(2)];
  assert.deepEqual(mergeNewPosts(shown, [post(3), post(2)]), shown);
});

test('un post déjà affiché garde sa version locale (commentaires ouverts, likes)', () => {
  const local = { id: 5, body: 'local', likes: 9 };
  const out = mergeNewPosts(
    [local],
    [
      { id: 6, body: 'neuf' },
      { id: 5, body: 'serveur', likes: 1 },
    ],
  );
  assert.equal(out[1], local);
});
