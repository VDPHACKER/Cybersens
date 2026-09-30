import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = process.cwd();
const MODEL = process.env.COURSE_TRANSLATION_MODEL || 'gemini-3.1-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const PROGRESS_PATH = path.join(ROOT, '.course-localization-progress.json');
const LANGUAGES = ['en', 'es'];
const EXCLUDED_FIELDS = new Set([
  'id',
  'moduleCode',
  'icon',
  'color',
  'duration',
  'type',
  'language',
  'code',
  'terminalCommand',
  'terminalOutput',
  'correct',
  'correctAnswer',
  'lessonsCount',
  'sectionNumber',
  'level',
]);
const FRENCH_MARKERS =
  /[àâçéèêëîïôùûüÿœæ]|\b(?:le|la|les|des|une|un|pour|avec|est|sont|dans|pas|plus|que|ce|cette|il|elle|vous|votre|qui|aux|du|de|et|ou|par|sur|dans|chaque|mais|comme|au|en)\b/i;

const readApiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();

  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, filename);
    if (!fs.existsSync(envPath)) continue;
    const line = fs
      .readFileSync(envPath, 'utf8')
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

const loadCourses = async () => {
  const result = await build({
    stdin: {
      contents:
        "import { COMPREHENSIVE_COURSE_MODULES } from './services/coursesData.ts';\nimport { ADVANCED_COURSE_MODULES } from './services/advancedCoursesData.ts';\nexport const COURSE_MODULES = [...COMPREHENSIVE_COURSE_MODULES, ...ADVANCED_COURSE_MODULES];",
      resolveDir: ROOT,
      sourcefile: 'course-generation-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  });
  const bundle = result.outputFiles[0].text;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle).toString('base64')}`;
  return (await import(moduleUrl)).COURSE_MODULES;
};

const loadLocalizedCourses = async () => {
  const result = await build({
    stdin: {
      contents:
        "import { COURSE_TRANSLATIONS_EN } from './services/courseTranslations.en.ts';\nimport { COURSE_TRANSLATIONS_ES } from './services/courseTranslations.es.ts';\nexport const LOCALIZED_COURSES = { en: COURSE_TRANSLATIONS_EN, es: COURSE_TRANSLATIONS_ES };",
      resolveDir: ROOT,
      sourcefile: 'localized-course-repair-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  });
  const bundle = result.outputFiles[0].text;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle).toString('base64')}`;
  return (await import(moduleUrl)).LOCALIZED_COURSES;
};

const collectTranslatableText = (value, output = {}, currentPath = []) => {
  if (typeof value === 'string') {
    const fieldName = currentPath.at(-1);
    if (fieldName !== undefined && !EXCLUDED_FIELDS.has(String(fieldName))) {
      output[currentPath.join('.')] = value;
    }
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTranslatableText(item, output, [...currentPath, index]));
    return output;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectTranslatableText(item, output, [...currentPath, key]);
    }
  }
  return output;
};

const setPathValue = (target, propertyPath, value) => {
  const parts = propertyPath.split('.');
  const finalKey = parts.pop();
  const parent = parts.reduce((current, part) => current[part], target);
  parent[finalKey] = value;
};

const parseResponse = (text) => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned);
};

const requestTranslation = async (apiKey, module, sourceText) => {
  const prompt = `You are a professional cybersecurity curriculum translator and instructional designer.

Return one valid JSON object with exactly these keys:
- "translations": objects "en" and "es", each containing every supplied path exactly once and its complete translation.
- "exercises": arrays "fr", "en", and "es", each containing one new practical exercise per lesson, in the same lesson order. Each item has exactly "lessonId", "title", "instructions", and "expectedOutcome".

Translate the supplied French course text naturally and accurately into English and Spanish. Preserve cybersecurity terminology, protocol and product names, standards, acronyms, numbers, technical meaning, warnings, and answer semantics. Translate prose, titles, categories, labels, quiz questions, options, explanations, objectives, lab instructions and hints. Do not invent, remove, summarize, or soften course content. Do not change keys or paths. The generated exercises should be short, actionable and safe: defensive practice in a local or hypothetical environment only, never attack real systems. Make each exercise specific to its lesson, with a clear expected outcome. French exercises must be written in French; English exercises in English; Spanish exercises in Spanish.

COURSE ID: ${module.id}
LESSON CONTEXT (for creating the exercises):
${JSON.stringify(
  module.lessons.map(({ id, title, content, keyTakeaways, checkYourUnderstanding }) => ({
    id,
    title,
    content,
    keyTakeaways,
    checkYourUnderstanding,
  })),
)}

TRANSLATION PATHS (translate every value, preserving each path):
${JSON.stringify(sourceText)}`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Follow the requested JSON contract exactly. Do not include markdown.' }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 65536,
        },
      }),
      signal: AbortSignal.timeout(180_000),
    });

    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
      if (text) {
        try {
          return parseResponse(text);
        } catch {
          if (attempt === 5) throw new Error(`Réponse JSON invalide pour ${module.id}`);
        }
      }
    } else {
      const message = body.error?.message || `HTTP ${response.status}`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 5) {
        throw new Error(`Traduction de ${module.id} impossible (${response.status}) : ${message}`);
      }
    }

    if (attempt < 5) {
      const delayMs = Math.min(5000 * 2 ** (attempt - 1), 40_000);
      console.log(`Nouvelle tentative pour ${module.id} dans ${delayMs / 1000} s (${attempt}/4).`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`Réponse de traduction vide pour ${module.id}`);
};

const requestMissingTranslations = async (apiKey, moduleId, missingText) => {
  const prompt = `Translate every French natural-language value below into both English and Spanish. The first item of a list is just as important as later items; do not leave it in French. Preserve technical names and literal command/code strings. For paths ending in ".diagramAscii", translate only the readable labels while preserving every newline, arrow, box character, and the overall line structure. Return valid JSON with exactly two keys, "en" and "es"; each value must contain every supplied path exactly once and the complete translation. Do not change any path, omit an item, or add commentary.\n\nCOURSE ID: ${moduleId}\nVALUES BY PATH:\n${JSON.stringify(missingText)}`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Return complete, accurate translations as strict JSON. No markdown.' }],
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
      const responseText = body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('');
      if (responseText) {
        try {
          const translations = parseResponse(responseText);
          if (
            LANGUAGES.every(
              (language) =>
                translations[language] &&
                Object.keys(missingText).every(
                  (textPath) => typeof translations[language][textPath] === 'string',
                ),
            )
          ) {
            return translations;
          }
        } catch {}
      }
    } else if (response.status !== 429 && response.status < 500) {
      throw new Error(
        `Correction de ${moduleId} refusée (${response.status}) : ${body.error?.message || 'erreur API'}`,
      );
    }

    if (attempt < 5) {
      const delayMs = Math.min(5000 * 2 ** (attempt - 1), 40_000);
      console.log(`Nouvelle tentative de correction pour ${moduleId} dans ${delayMs / 1000} s.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } else {
      throw new Error(`Impossible de compléter les traductions omises pour ${moduleId}`);
    }
  }
};

const checkGeminiAccess = async (apiKey) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Return exactly the word OK.' }] }],
      generationConfig: { maxOutputTokens: 8 },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Accès Gemini refusé (${response.status}) : ${body.error?.message || 'erreur API'}`,
    );
  }
  console.log('Accès au modèle Gemini confirmé.');
};

const validateResult = (module, sourceText, result) => {
  const expectedPaths = Object.keys(sourceText);
  for (const language of LANGUAGES) {
    const translated = result.translations?.[language];
    if (!translated || expectedPaths.some((textPath) => typeof translated[textPath] !== 'string')) {
      throw new Error(`Traduction ${language} incomplète pour ${module.id}`);
    }
  }

  const expectedLessons = module.lessons.map((lesson) => lesson.id);
  for (const language of ['fr', ...LANGUAGES]) {
    const exercises = result.exercises?.[language];
    if (
      !Array.isArray(exercises) ||
      exercises.length !== expectedLessons.length ||
      exercises.some(
        (exercise, index) =>
          exercise.lessonId !== expectedLessons[index] ||
          !exercise.title?.trim() ||
          !exercise.instructions?.trim() ||
          !exercise.expectedOutcome?.trim(),
      )
    ) {
      throw new Error(`Exercices ${language} incomplets ou mal ordonnés pour ${module.id}`);
    }
  }
};

const saveTypeScript = (filename, exportName, typeName, value) => {
  const typeImport = typeName ? `import type { ${typeName} } from '../types';\n\n` : '';
  const annotation =
    typeName === 'CourseModule'
      ? ': CourseModule[]'
      : typeName === 'PracticalExercise'
        ? ': Record<string, PracticalExercise>'
        : '';
  const typeAssertion = typeName === 'CourseModule' ? ' satisfies CourseModule[]' : '';
  const output = `${typeImport}export const ${exportName}${annotation} = ${JSON.stringify(value, null, 2)}${typeAssertion};\n`;
  fs.writeFileSync(path.join(ROOT, filename), output, 'utf8');
};

const repairUntranslatedCourses = async (apiKey) => {
  const sourceCourses = await loadCourses();
  const localizedCourses = await loadLocalizedCourses();
  const courseByLanguage = Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      new Map(localizedCourses[language].map((course) => [course.id, course])),
    ]),
  );
  let repairedStrings = 0;

  for (const sourceCourse of sourceCourses) {
    const sourceText = collectTranslatableText(sourceCourse);
    const missingText = Object.fromEntries(
      Object.entries(sourceText).filter(([textPath, value]) => {
        if (value.length < 8 || !FRENCH_MARKERS.test(value)) return false;
        return LANGUAGES.some((language) => {
          const localized = collectTranslatableText(
            courseByLanguage[language].get(sourceCourse.id),
          );
          return localized[textPath] === value;
        });
      }),
    );
    const missingCount = Object.keys(missingText).length;
    if (!missingCount) continue;

    console.log(`Correction des textes restés en français : ${sourceCourse.id} (${missingCount}).`);
    const translations = await requestMissingTranslations(apiKey, sourceCourse.id, missingText);
    for (const language of LANGUAGES) {
      const localizedCourse = courseByLanguage[language].get(sourceCourse.id);
      for (const [textPath, translation] of Object.entries(translations[language])) {
        setPathValue(localizedCourse, textPath, translation);
      }
    }
    repairedStrings += missingCount;
  }

  saveTypeScript(
    'services/courseTranslations.en.ts',
    'COURSE_TRANSLATIONS_EN',
    'CourseModule',
    localizedCourses.en,
  );
  saveTypeScript(
    'services/courseTranslations.es.ts',
    'COURSE_TRANSLATIONS_ES',
    'CourseModule',
    localizedCourses.es,
  );
  console.log(
    `Corrections terminées : ${repairedStrings} textes repris dans les traductions EN/ES.`,
  );
};

const main = async () => {
  const apiKey = readApiKey();
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    throw new Error('GEMINI_API_KEY est absent de .env.local/.env ou de l’environnement.');
  }
  if (process.argv.includes('--check')) {
    await checkGeminiAccess(apiKey);
    return;
  }
  if (process.argv.includes('--repair-untranslated')) {
    await repairUntranslatedCourses(apiKey);
    return;
  }

  const courses = await loadCourses();
  const progress = fs.existsSync(PROGRESS_PATH)
    ? JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
    : { courses: {}, exercises: { fr: {}, en: {}, es: {} } };
  const translatedCourses = { en: [], es: [] };

  for (const course of courses) {
    let result = progress.courses[course.id];
    if (!result) {
      console.log(`Traduction en cours : ${course.id}`);
      const sourceText = collectTranslatableText(course);
      result = await requestTranslation(apiKey, course, sourceText);
      validateResult(course, sourceText, result);
      progress.courses[course.id] = result;
      for (const language of ['fr', ...LANGUAGES]) {
        for (const exercise of result.exercises[language]) {
          progress.exercises[language][exercise.lessonId] = {
            title: exercise.title,
            instructions: exercise.instructions,
            expectedOutcome: exercise.expectedOutcome,
          };
        }
      }
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress), 'utf8');
    } else {
      validateResult(course, collectTranslatableText(course), result);
    }

    for (const language of LANGUAGES) {
      const localizedCourse = structuredClone(course);
      for (const [textPath, text] of Object.entries(result.translations[language])) {
        setPathValue(localizedCourse, textPath, text);
      }
      localizedCourse.lessons.forEach((lesson) => {
        lesson.practicalExercise = progress.exercises[language][lesson.id];
      });
      translatedCourses[language].push(localizedCourse);
    }
  }

  saveTypeScript(
    'services/courseTranslations.en.ts',
    'COURSE_TRANSLATIONS_EN',
    'CourseModule',
    translatedCourses.en,
  );
  saveTypeScript(
    'services/courseTranslations.es.ts',
    'COURSE_TRANSLATIONS_ES',
    'CourseModule',
    translatedCourses.es,
  );
  saveTypeScript(
    'services/courseExercises.fr.ts',
    'COURSE_EXERCISES_FR',
    'PracticalExercise',
    progress.exercises.fr,
  );
  fs.rmSync(PROGRESS_PATH, { force: true });
  console.log(
    `Traductions statiques prêtes : ${courses.length} cours, ${courses.reduce((n, course) => n + course.lessons.length, 0)} leçons, anglais et espagnol.`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Échec de la génération des traductions.');
  process.exitCode = 1;
});
