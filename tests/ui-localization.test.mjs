import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UI_TEXT_TRANSLATIONS } from '../services/uiTextTranslations.ts';
import { getLocalizedNewsArticles } from '../services/learningContent.ts';

const REQUIRED_COPY = [
  'Connexion',
  'Créer votre compte apprenant',
  'Sensibiliser • Protéger • Agir',
  'Apprendre simplement',
  'Adopter les bons réflexes',
  'Protéger notre communauté',
  'Commencer',
  'Bon retour parmi nous',
  'Les deux mots de passe ne correspondent pas.',
  'Veuillez saisir un drapeau avant de valider.',
  'Aucune formation trouvée',
];

test('les pages d’entrée et les textes partagés sont traduits dans les trois langues', () => {
  for (const sourceText of REQUIRED_COPY) {
    const translations = UI_TEXT_TRANSLATIONS[sourceText];
    assert.ok(translations, `chaîne UI extraite : ${sourceText}`);
    for (const language of ['fr', 'en', 'es']) {
      assert.equal(typeof translations[language], 'string');
      assert.ok(translations[language].trim(), `${language}: ${sourceText}`);
    }
  }
});

test('le catalogue UI ne contient aucune entrée partiellement traduite', () => {
  for (const [sourceText, translations] of Object.entries(UI_TEXT_TRANSLATIONS)) {
    for (const language of ['fr', 'en', 'es']) {
      assert.equal(typeof translations[language], 'string', `${language}: ${sourceText}`);
      assert.ok(translations[language].trim(), `${language}: ${sourceText}`);
    }
  }
});

test('les articles d’actualité sont localisés selon la langue active', () => {
  const frArticle = getLocalizedNewsArticles('fr')[0];
  const enArticle = getLocalizedNewsArticles('en')[0];
  const esArticle = getLocalizedNewsArticles('es')[0];

  assert.ok(frArticle.title.includes('Comment') || frArticle.title.includes('arnaque'));
  assert.ok(enArticle.title !== frArticle.title);
  assert.ok(esArticle.title !== frArticle.title);
  assert.ok(enArticle.summary !== frArticle.summary);
  assert.ok(esArticle.summary !== frArticle.summary);
});
