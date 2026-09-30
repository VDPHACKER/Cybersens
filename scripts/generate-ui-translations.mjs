import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const MODEL = process.env.UI_TRANSLATION_MODEL || 'gemini-3.1-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const PROGRESS_PATH = path.join(ROOT, '.ui-localization-progress.json');
const OUTPUT_PATH = path.join(ROOT, 'services/uiTextTranslations.ts');
const LANGUAGES = ['fr', 'en', 'es'];
const JSX_ATTRIBUTES = new Set(['alt', 'aria-description', 'aria-label', 'placeholder', 'title']);
const UI_PROPERTIES = new Set([
  'actions',
  'btnText',
  'buttonLabel',
  'category',
  'checklist',
  'content',
  'description',
  'details',
  'desc',
  'emptyMessage',
  'error',
  'explanation',
  'hint',
  'hints',
  'instructions',
  'label',
  'message',
  'name',
  'options',
  'question',
  'readTime',
  'summary',
  'subtitle',
  'success',
  'text',
  'title',
  'tabTitle',
]);
const UI_VARIABLES = new Set([
  'description',
  'error',
  'errorMessage',
  'greeting',
  'label',
  'message',
  'notifyMsg',
  'placeholder',
  'subtitle',
  'successMsg',
  'ROLES',
  'roles',
  'title',
]);

const readApiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) continue;
    const line = fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .find((entry) => /^\s*(?:export\s+)?GEMINI_API_KEY\s*=/.test(entry));
    if (!line) continue;
    const value = line.replace(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*/, '').trim();
    return value.replace(
      /^(?:"([\s\S]*)"|'([\s\S]*)')$/,
      (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted,
    );
  }
  return '';
};

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

const looksLikeUiText = (value) => {
  const text = normalize(value);
  if (text.length < 2 || text.length > 500) return false;
  if (!/[\p{L}]/u.test(text) || /^[\w.-]+$/.test(text)) return false;
  if (/^(?:https?:|mailto:|data:|javascript:)/i.test(text)) return false;
  if (/[{};]|=>|\b(?:className|rounded-|text-|bg-|hover:|dark:|border-)/.test(text)) return false;
  if (/^(?:#[\da-f]{3,8}|\d+(?:px|rem|vh|vw|ms|s|%)?)$/i.test(text)) return false;
  return true;
};

const isCodeElement = (node, sourceFile) => {
  let current = node.parent;
  while (current && current !== sourceFile) {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const opening = ts.isJsxElement(current) ? current.openingElement : current;
      if (
        ['code', 'pre', 'script', 'style', 'textarea'].includes(
          opening.tagName.getText(sourceFile).toLowerCase(),
        )
      ) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
};

const addText = (set, value) => {
  if (typeof value === 'string' && looksLikeUiText(value)) set.add(normalize(value));
};

const collectFromValue = (set, node) => {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    addText(set, node.text);
    return;
  }
  ts.forEachChild(node, (child) => collectFromValue(set, child));
};

const collectStrings = (sourcePath, set) => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node) => {
    if (ts.isJsxText(node) && !isCodeElement(node, sourceFile)) {
      addText(set, node.text);
    } else if (ts.isJsxAttribute(node) && JSX_ATTRIBUTES.has(node.name.getText(sourceFile))) {
      if (node.initializer && ts.isStringLiteral(node.initializer))
        addText(set, node.initializer.text);
    } else if (ts.isJsxExpression(node) && node.expression && !isCodeElement(node, sourceFile)) {
      collectFromValue(set, node.expression);
    } else if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/^['"]|['"]$/g, '');
      if (UI_PROPERTIES.has(name)) collectFromValue(set, node.initializer);
    } else if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
      if (UI_VARIABLES.has(node.name.text) && node.initializer)
        collectFromValue(set, node.initializer);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sourceFile);
      if (callee === 't' && node.arguments.length > 1) collectFromValue(set, node.arguments[1]);
      if (/^(?:setError|setFeedback|alert|confirm)$/.test(callee)) {
        node.arguments.forEach((argument) => collectFromValue(set, argument));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
};

const listSourceFiles = (directory) => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dev-dist', 'backup-avant-allongement'].includes(entry.name))
      continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(filePath));
    else if (/\.(?:tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
      files.push(filePath);
  }
  return files;
};

const loadTexts = () => {
  const files = [
    path.join(ROOT, 'App.tsx'),
    ...listSourceFiles(path.join(ROOT, 'components')),
    ...listSourceFiles(path.join(ROOT, 'features')),
  ];
  files.push(path.join(ROOT, 'services/learningContent.ts'));
  const texts = new Set();
  for (const filePath of files) collectStrings(filePath, texts);
  return [...texts].sort((left, right) => left.localeCompare(right));
};

const readProgress = () => {
  if (!fs.existsSync(PROGRESS_PATH)) return { translations: {}, nextIndex: 0 };
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  } catch {
    return { translations: {}, nextIndex: 0 };
  }
};

const translateBatch = async (apiKey, batch, startIndex) => {
  const items = batch.map((text, offset) => ({ id: String(startIndex + offset), source: text }));
  const prompt = `Translate these user-facing strings from a cybersecurity education app into French, English and Spanish. Each source may already be in any of those languages. Preserve product names, protocol names, acronyms, keyboard shortcuts, numbers, and security meaning. Use concise natural interface language. If a source is a brand, acronym, code fragment, protocol, or language-neutral label, keep it unchanged in all languages. Return strict JSON with exactly one property "items", an array containing one object per supplied item with exactly the same "id" and the fields "fr", "en", and "es". Include every id exactly once; do not add commentary or markdown.\n\nINPUT:\n${JSON.stringify(items)}`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Return complete, accurate UI translations in strict JSON.' }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 32768,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      const output = body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
      if (output) {
        try {
          const parsed = JSON.parse(
            output
              .trim()
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/, ''),
          );
          if (
            Array.isArray(parsed.items) &&
            parsed.items.length === items.length &&
            items.every((item) =>
              parsed.items.some(
                (translated) =>
                  translated.id === item.id &&
                  LANGUAGES.every(
                    (lang) => typeof translated[lang] === 'string' && translated[lang].trim(),
                  ),
              ),
            )
          ) {
            return parsed.items;
          }
        } catch {}
      }
    } else if (response.status !== 429 && response.status < 500) {
      throw new Error(
        `Gemini a refusé le lot (${response.status}) : ${body.error?.message || 'erreur API'}`,
      );
    }

    if (attempt < 5) {
      const delay = Math.min(5000 * 2 ** (attempt - 1), 40_000);
      console.log(`Nouvelle tentative du lot dans ${delay / 1000} s.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Impossible de traduire un lot de textes UI après plusieurs tentatives.');
};

const main = async () => {
  if (process.argv.includes('--count')) {
    console.log(`${loadTexts().length} chaînes visibles candidates à la traduction.`);
    return;
  }

  const apiKey = readApiKey();
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    throw new Error('GEMINI_API_KEY est absent de .env.local/.env ou de l’environnement.');
  }

  const texts = loadTexts();
  const progress = readProgress();
  const batchSize = 35;
  console.log(`${texts.length} textes UI à vérifier/traduire.`);

  for (let index = progress.nextIndex || 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    console.log(`Traduction UI : ${index + 1}-${index + batch.length} / ${texts.length}`);
    const translatedItems = await translateBatch(apiKey, batch, index);
    for (const item of translatedItems) {
      const source = texts[Number(item.id)];
      progress.translations[source] = {
        fr: item.fr.trim(),
        en: item.en.trim(),
        es: item.es.trim(),
      };
    }
    progress.nextIndex = index + batch.length;
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress), 'utf8');
  }

  const output = `import type { Language } from '../types';\n\nexport const UI_TEXT_TRANSLATIONS: Record<string, Record<Language, string>> = ${JSON.stringify(progress.translations, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  fs.rmSync(PROGRESS_PATH, { force: true });
  console.log(
    `Traductions UI intégrées : ${Object.keys(progress.translations).length} chaînes en fr/en/es.`,
  );
};

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Échec de la génération des traductions UI.',
  );
  process.exitCode = 1;
});
