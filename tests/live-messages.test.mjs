// Textes des notifications en direct (FR / EN / ES). npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveMessage } from '../services/liveFeedMessages.ts';

const post = { id: 1, topic: 'astuce', author: 'Awa T.', excerpt: 'Activez le 2FA' };

test('nouveau post de la Communauté, dans les trois langues', () => {
  assert.equal(
    liveMessage('community_post', post, 'fr'),
    'Awa T. a publié dans la Communauté : « Activez le 2FA »',
  );
  assert.match(liveMessage('community_post', post, 'en'), /^Awa T\. posted in the Community/);
  assert.match(liveMessage('community_post', post, 'es'), /^Awa T\. publicó en la Comunidad/);
});

test('actualités : un titre ou un total', () => {
  const one = { count: 1, items: [{ id: 'a', title: 'Faille critique', source: 'CERT-FR' }] };
  const many = { count: 5, items: [] };
  assert.equal(liveMessage('news', one, 'fr'), 'Nouvelle actualité : Faille critique');
  assert.equal(liveMessage('news', one, 'en'), 'New article: Faille critique');
  assert.equal(liveMessage('news', many, 'fr'), '5 nouvelles actualités cyber');
  assert.equal(liveMessage('news', many, 'es'), '5 nuevas noticias de ciberseguridad');
});

test('langue inconnue : français', () => {
  assert.match(liveMessage('community_post', post, 'xx'), /a publié/);
});
