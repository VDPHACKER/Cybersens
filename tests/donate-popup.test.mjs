// Tests de la mise en sourdine du panneau de don : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDonatePopupMuted,
  muteDonatePopupToday,
  localDay,
  DONATE_POPUP_MUTE_KEY,
} from '../services/donatePopup.ts';

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
  };
};

test('le panneau de don n’est pas coupé par défaut', () => {
  assert.equal(isDonatePopupMuted(memoryStorage()), false);
});

test('« ne plus afficher aujourd’hui » coupe le panneau toute la journée', () => {
  const storage = memoryStorage();
  const morning = new Date(2026, 8, 30, 8, 0, 0);
  const night = new Date(2026, 8, 30, 23, 59, 59);
  muteDonatePopupToday(storage, morning);
  assert.equal(isDonatePopupMuted(storage, morning), true);
  assert.equal(isDonatePopupMuted(storage, night), true, 'toujours coupé le soir même');
});

test('le panneau revient le lendemain', () => {
  const storage = memoryStorage();
  muteDonatePopupToday(storage, new Date(2026, 8, 30, 12, 0, 0));
  assert.equal(isDonatePopupMuted(storage, new Date(2026, 9, 1, 0, 0, 1)), false);
});

test('le jour est celui de l’horloge locale, au format AAAA-MM-JJ', () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  assert.equal(localDay(new Date(2026, 11, 31, 0, 5)), '2026-12-31');
});

test('un stockage indisponible ne casse rien', () => {
  const broken = {
    getItem: () => {
      throw new Error('bloqué');
    },
    setItem: () => {
      throw new Error('plein');
    },
  };
  assert.equal(isDonatePopupMuted(broken), false);
  assert.doesNotThrow(() => muteDonatePopupToday(broken));
});

test('une valeur corrompue est ignorée', () => {
  const storage = memoryStorage();
  storage.setItem(DONATE_POPUP_MUTE_KEY, 'n’importe quoi');
  assert.equal(isDonatePopupMuted(storage), false);
});
