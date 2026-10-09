// Notifications système : quand proposer de les activer, quand les afficher, titres localisés. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROMPT_SNOOZE_MS,
  shouldOfferPush,
  shouldShowSystemNotification,
} from '../services/pushPrompt.ts';
import { liveTitle } from '../services/liveFeedMessages.ts';

const NOW = 1_800_000_000_000;
const base = {
  supported: true,
  permission: 'default',
  enabled: false,
  snoozedUntil: null,
  now: NOW,
};

test('invitation : proposée seulement si utile et jamais insistante', () => {
  assert.equal(shouldOfferPush(base), true);
  assert.equal(
    shouldOfferPush({ ...base, permission: 'granted' }),
    true,
    'permission déjà donnée mais pas encore activé',
  );
  assert.equal(shouldOfferPush({ ...base, supported: false }), false, 'navigateur incompatible');
  assert.equal(
    shouldOfferPush({ ...base, permission: 'denied' }),
    false,
    'bloquées dans le navigateur : inutile de redemander',
  );
  assert.equal(shouldOfferPush({ ...base, enabled: true }), false, 'déjà activées');
});

test('invitation : « Plus tard » la repousse d’une semaine', () => {
  assert.equal(PROMPT_SNOOZE_MS, 7 * 24 * 3600 * 1000);
  assert.equal(shouldOfferPush({ ...base, snoozedUntil: NOW + 1000 }), false);
  assert.equal(shouldOfferPush({ ...base, snoozedUntil: NOW }), true, 'délai écoulé');
  assert.equal(shouldOfferPush({ ...base, snoozedUntil: NOW - 1 }), true);
});

test('notification système : seulement si l’utilisateur ne regarde pas déjà l’application', () => {
  const show = (permission, visible, focused) =>
    shouldShowSystemNotification({ permission, visible, focused });
  assert.equal(show('granted', false, false), true, 'onglet en arrière-plan');
  assert.equal(show('granted', true, false), true, 'fenêtre visible mais derrière une autre appli');
  assert.equal(
    show('granted', true, true),
    false,
    'l’utilisateur regarde l’appli : le toast suffit',
  );
  assert.equal(show('default', false, false), false, 'sans permission');
  assert.equal(show('denied', false, false), false, 'permission refusée');
});

test('titres des notifications, dans les trois langues', () => {
  assert.equal(liveTitle('community_post', 'fr'), 'Communauté CyberSens');
  assert.equal(liveTitle('community_post', 'en'), 'CyberSens Community');
  assert.equal(liveTitle('community_post', 'es'), 'Comunidad CyberSens');
  assert.equal(liveTitle('news', 'fr'), 'Actualité cyber');
  assert.equal(liveTitle('news', 'en'), 'Cyber news');
  assert.equal(liveTitle('news', 'xx'), 'Actualité cyber');
});
