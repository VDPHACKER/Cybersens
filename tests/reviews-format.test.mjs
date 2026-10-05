// Libellé du nombre de membres. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { membersLabel } from '../services/reviewsFormat.ts';

test('nombre de membres : singulier, pluriel, séparateurs, langues', () => {
  assert.equal(membersLabel(1, 'fr'), '1 membre inscrit');
  assert.equal(membersLabel(0, 'fr'), '0 membre inscrit');
  assert.equal(membersLabel(2, 'fr'), '2 membres inscrits');
  assert.equal(membersLabel(1, 'en'), '1 registered member');
  assert.equal(membersLabel(1500, 'en'), '1,500 registered members');
  assert.equal(membersLabel(3, 'es'), '3 miembros registrados');
  assert.equal(membersLabel(1, 'es'), '1 miembro registrado');
});
