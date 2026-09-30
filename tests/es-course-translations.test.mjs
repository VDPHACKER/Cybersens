// Contrôle des traductions espagnoles des cours : chaque texte doit rester aligné avec le texte source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_TRANSLATIONS_EN } from '../services/courseTranslations.en.ts';
import { COURSE_TRANSLATIONS_ES } from '../services/courseTranslations.es.ts';
import { collectTranslatableStrings } from '../services/courseLocalizer.ts';

// Structure sans les textes traduisibles : identifiants, bonnes réponses, niveaux, code, schémas…
const skeleton = (module) =>
  JSON.parse(JSON.stringify(module), (key, value) =>
    typeof value === 'string' &&
    ![
      'id',
      'moduleCode',
      'curriculumTrack',
      'icon',
      'color',
      'level',
      'duration',
      'sectionNumber',
      'type',
      'language',
      'code',
      'diagramAscii',
    ].includes(key)
      ? '§'
      : value,
  );

const translated = COURSE_TRANSLATIONS_ES.filter((m, i) => m !== COURSE_TRANSLATIONS_EN[i]);

test('les 12 modules sont traduits en espagnol', () => {
  assert.equal(COURSE_TRANSLATIONS_ES.length, 12);
  assert.equal(
    translated.length,
    12,
    `modules encore en anglais : ${
      COURSE_TRANSLATIONS_ES.filter((m, i) => m === COURSE_TRANSLATIONS_EN[i])
        .map((m) => m.id)
        .join(', ') || 'aucun'
    }`,
  );
});

test('chaque module espagnol garde la structure, les identifiants et les bonnes réponses du source', () => {
  for (const es of translated) {
    const en = COURSE_TRANSLATIONS_EN.find((m) => m.id === es.id);
    assert.deepEqual(skeleton(es), skeleton(en), `${es.id} : structure identique au source`);
    const enLessons = en.lessons;
    es.lessons.forEach((lesson, i) => {
      assert.equal(lesson.id, enLessons[i].id);
      assert.equal(
        lesson.checkYourUnderstanding?.correct,
        enLessons[i].checkYourUnderstanding?.correct,
        `${lesson.id} : bonne réponse conservée`,
      );
    });
    (es.examQuestions || []).forEach((q, i) => {
      assert.equal(
        q.correctAnswer,
        en.examQuestions[i].correctAnswer,
        `${es.id} examen Q${i + 1} : bonne réponse conservée`,
      );
    });
  }
});

test('les traductions espagnoles restent alignées avec le source (chiffres conservés, texte réellement traduit)', () => {
  for (const es of translated) {
    const en = COURSE_TRANSLATIONS_EN.find((m) => m.id === es.id);
    const src = collectTranslatableStrings(en);
    const dst = collectTranslatableStrings(es);
    assert.equal(dst.length, src.length, `${es.id} : nombre de textes`);
    let identicalLong = 0;
    let long = 0;
    src.forEach((text, i) => {
      // Les nombres et versions du source doivent se retrouver dans la traduction (détecte un décalage d'index)
      const digits = text.match(/\d+/g) || [];
      const target = dst[i].match(/\d+/g) || [];
      for (const d of digits)
        assert.ok(
          target.includes(d),
          `${es.id}[${i}] : le nombre « ${d} » doit être conservé\n  EN: ${text.slice(0, 90)}\n  ES: ${dst[i].slice(0, 90)}`,
        );
      assert.ok(dst[i].trim().length > 0, `${es.id}[${i}] : texte vide`);
      if (text.length > 40) {
        long++;
        if (dst[i] === text) identicalLong++;
      }
    });
    assert.ok(
      identicalLong / long < 0.05,
      `${es.id} : trop de textes longs identiques à l'anglais (${identicalLong}/${long})`,
    );
  }
});
