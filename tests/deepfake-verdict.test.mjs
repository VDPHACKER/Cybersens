// Garde-fous anti faux positifs de l'analyse deepfake. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnalysis, combineAnalyses } from '../services/deepfakeVerdict.ts';

const ind = (strength, observation = 'Observation précise à 0:12 sur la mâchoire') => ({
  name: 'Indice',
  observation,
  strength,
});
const raw = (verdict, indicators = [], extra = {}) => ({
  usable: true,
  verdict,
  indicators,
  limitations: '',
  ...extra,
});

test('réponse inexploitable ou verdict inconnu : indéterminé', () => {
  assert.equal(normalizeAnalysis(null).verdict, 'indetermine');
  assert.equal(normalizeAnalysis('texte').verdict, 'indetermine');
  assert.equal(normalizeAnalysis(raw('certain_a_100')).verdict, 'indetermine');
});

test('synthétique probable sans assez d’indices : rétrogradé', () => {
  assert.equal(normalizeAnalysis(raw('synthetique_probable')).verdict, 'indetermine');
  assert.equal(
    normalizeAnalysis(raw('synthetique_probable', [ind('forte')])).verdict,
    'indetermine',
  );
  assert.equal(
    normalizeAnalysis(raw('synthetique_probable', [ind('faible'), ind('faible'), ind('forte')]))
      .verdict,
    'indetermine',
    'les indices faibles ne comptent pas',
  );
  assert.equal(
    normalizeAnalysis(raw('synthetique_probable', [ind('moyenne'), ind('moyenne')])).verdict,
    'indetermine',
    'deux indices moyens sans indice fort ne suffisent pas',
  );
});

test('synthétique probable avec 2 indices dont 1 fort : conservé', () => {
  const a = normalizeAnalysis(raw('synthetique_probable', [ind('forte'), ind('moyenne')]));
  assert.equal(a.verdict, 'synthetique_probable');
  assert.equal(a.downgradeReason, undefined);
});

test('indices sans observation concrète : écartés', () => {
  const a = normalizeAnalysis(
    raw('synthetique_probable', [ind('forte', 'bizarre'), ind('forte', 'louche')]),
  );
  assert.equal(a.verdict, 'indetermine');
  assert.equal(a.indicators.length, 0);
});

test('média inexploitable : indéterminé même si le modèle conclut', () => {
  const a = normalizeAnalysis(
    raw('synthetique_probable', [ind('forte'), ind('forte')], { usable: false }),
  );
  assert.equal(a.verdict, 'indetermine');
});

test('« aucun indice » incohérent avec des indices forts : indéterminé', () => {
  assert.equal(normalizeAnalysis(raw('aucun_indice', [ind('forte')])).verdict, 'indetermine');
  assert.equal(normalizeAnalysis(raw('aucun_indice', [ind('faible')])).verdict, 'aucun_indice');
  assert.equal(normalizeAnalysis(raw('aucun_indice')).verdict, 'aucun_indice');
});

test('fusion : seul un accord total est retenu', () => {
  const syn = normalizeAnalysis(raw('synthetique_probable', [ind('forte'), ind('moyenne')]));
  const none = normalizeAnalysis(raw('aucun_indice'));
  assert.equal(combineAnalyses([syn, syn]).verdict, 'synthetique_probable');
  assert.equal(combineAnalyses([none, none]).verdict, 'aucun_indice');
  const split = combineAnalyses([syn, none]);
  assert.equal(split.verdict, 'indetermine');
  assert.ok(split.downgradeReason);
  assert.equal(combineAnalyses([]).verdict, 'indetermine');
});
