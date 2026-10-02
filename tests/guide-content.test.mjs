// Contenu du Guide d'utilisation : trois langues partout, identifiants uniques, cibles valides.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDE_SECTIONS, QUICK_START, TROUBLESHOOTING } from '../features/Guide/guideContent.ts';

const LANGS = ['fr', 'en', 'es'];

const assertTr = (value, label) => {
  for (const lang of LANGS) {
    assert.equal(typeof value?.[lang], 'string', `${label} : ${lang} manquant`);
    assert.ok(value[lang].trim(), `${label} : ${lang} vide`);
  }
};

test('chaque texte du guide existe en français, anglais et espagnol', () => {
  QUICK_START.forEach((s, i) => assertTr(s, `démarrage rapide #${i + 1}`));
  for (const s of GUIDE_SECTIONS) {
    assertTr(s.title, `${s.id}.title`);
    assertTr(s.summary, `${s.id}.summary`);
    assert.ok(s.steps.length > 0, `${s.id} sans étapes`);
    s.steps.forEach((step, i) => assertTr(step, `${s.id}.steps[${i}]`));
    (s.tips ?? []).forEach((tip, i) => assertTr(tip, `${s.id}.tips[${i}]`));
  }
  for (const p of TROUBLESHOOTING) {
    assertTr(p.question, `${p.id}.question`);
    assertTr(p.answer, `${p.id}.answer`);
  }
});

test('les identifiants du guide sont uniques', () => {
  for (const list of [GUIDE_SECTIONS, TROUBLESHOOTING]) {
    const ids = list.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('chaque bouton « Ouvrir » pointe vers un onglet existant', () => {
  const types = fs.readFileSync(new URL('../types.ts', import.meta.url), 'utf8');
  const enumBody = types.match(/export enum AppTab \{([\s\S]*?)\n\}/)[1];
  const tabs = [...enumBody.matchAll(/=\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(tabs.includes('guide'));
  for (const s of GUIDE_SECTIONS.filter((x) => x.target)) {
    assert.ok(tabs.includes(s.target), `${s.id} : onglet inconnu « ${s.target} »`);
  }
});
