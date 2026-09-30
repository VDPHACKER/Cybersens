import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPREHENSIVE_COURSE_MODULES } from '../services/coursesData.ts';
import { ADVANCED_COURSE_MODULES } from '../services/advancedCoursesData.ts';
import { COURSE_TRANSLATIONS_EN } from '../services/courseTranslations.en.ts';
import { COURSE_TRANSLATIONS_ES } from '../services/courseTranslations.es.ts';
import { COURSE_EXERCISES_FR } from '../services/courseExercises.fr.ts';

const sourceCourses = [...COMPREHENSIVE_COURSE_MODULES, ...ADVANCED_COURSE_MODULES];
const localizedCourses = {
  en: COURSE_TRANSLATIONS_EN,
  es: COURSE_TRANSLATIONS_ES,
};
const frenchMarkers =
  /[àâçéèêëîïôùûüÿœæ]|\b(?:le|la|les|des|une|un|pour|avec|est|sont|dans|pas|plus|que|ce|cette|il|elle|vous|votre|qui|aux|du|de|et|ou|par|sur|chaque|mais|comme|au|en)\b/i;

test('les traductions couvrent chaque cours, leçon, quiz et examen sans changer les réponses', () => {
  for (const [language, courses] of Object.entries(localizedCourses)) {
    assert.equal(courses.length, sourceCourses.length, `${language}: nombre de cours`);

    for (const source of sourceCourses) {
      const localized = courses.find((course) => course.id === source.id);
      assert.ok(localized, `${language}: cours ${source.id} présent`);
      assert.notEqual(localized.title, source.title, `${language}: titre traduit (${source.id})`);
      assert.equal(localized.lessons.length, source.lessons.length);

      for (const sourceLesson of source.lessons) {
        const localizedLesson = localized.lessons.find((lesson) => lesson.id === sourceLesson.id);
        assert.ok(localizedLesson, `${language}: leçon ${sourceLesson.id} présente`);
        assert.ok(localizedLesson.practicalExercise?.instructions, `${language}: exercice présent`);
        assert.equal(
          localizedLesson.checkYourUnderstanding?.correct,
          sourceLesson.checkYourUnderstanding?.correct,
          `${language}: réponse du quiz ${sourceLesson.id} inchangée`,
        );
        assert.equal(
          localizedLesson.checkYourUnderstanding?.options.length,
          sourceLesson.checkYourUnderstanding?.options.length,
        );
      }

      assert.deepEqual(
        localized.examQuestions?.map(({ id, correctAnswer }) => [id, correctAnswer]),
        source.examQuestions?.map(({ id, correctAnswer }) => [id, correctAnswer]),
        `${language}: réponses de certification inchangées (${source.id})`,
      );
    }
  }
});

test('aucun contenu pédagogique principal ne reste identique au français', () => {
  const untranslated = [];
  const compareText = (language, sourceText, translatedText, label) => {
    if (
      sourceText &&
      sourceText.length > 7 &&
      frenchMarkers.test(sourceText) &&
      sourceText === translatedText
    ) {
      untranslated.push(`${language} ${label}: ${sourceText}`);
    }
  };

  for (const [language, courses] of Object.entries(localizedCourses)) {
    for (const source of sourceCourses) {
      const localized = courses.find((course) => course.id === source.id);
      compareText(language, source.title, localized.title, `${source.id} title`);
      compareText(language, source.description, localized.description, `${source.id} description`);
      compareText(
        language,
        source.curriculumTrack,
        localized.curriculumTrack,
        `${source.id} track`,
      );
      source.moduleObjectives?.forEach((objective, index) =>
        compareText(
          language,
          objective,
          localized.moduleObjectives?.[index],
          `${source.id} objective ${index + 1}`,
        ),
      );

      if (source.interactiveLab && localized.interactiveLab) {
        compareText(
          language,
          source.interactiveLab.title,
          localized.interactiveLab.title,
          `${source.id} lab title`,
        );
        compareText(
          language,
          source.interactiveLab.instructions,
          localized.interactiveLab.instructions,
          `${source.id} lab instructions`,
        );
        source.interactiveLab.hints?.forEach((hint, index) =>
          compareText(
            language,
            hint,
            localized.interactiveLab?.hints?.[index],
            `${source.id} lab hint ${index + 1}`,
          ),
        );
      }

      source.lessons.forEach((sourceLesson) => {
        const lesson = localized.lessons.find((item) => item.id === sourceLesson.id);
        compareText(language, sourceLesson.title, lesson.title, `${sourceLesson.id} title`);
        sourceLesson.content.forEach((paragraph, index) =>
          compareText(
            language,
            paragraph,
            lesson.content[index],
            `${sourceLesson.id} paragraph ${index + 1}`,
          ),
        );
        sourceLesson.keyTakeaways.forEach((point, index) =>
          compareText(
            language,
            point,
            lesson.keyTakeaways[index],
            `${sourceLesson.id} takeaway ${index + 1}`,
          ),
        );
        compareText(language, sourceLesson.proTip, lesson.proTip, `${sourceLesson.id} tip`);
        compareText(
          language,
          sourceLesson.securityAlert,
          lesson.securityAlert,
          `${sourceLesson.id} alert`,
        );
        compareText(
          language,
          sourceLesson.diagramTitle,
          lesson.diagramTitle,
          `${sourceLesson.id} diagram title`,
        );
        compareText(
          language,
          sourceLesson.diagramAscii,
          lesson.diagramAscii,
          `${sourceLesson.id} diagram`,
        );
        compareText(
          language,
          sourceLesson.codeSnippet?.caption,
          lesson.codeSnippet?.caption,
          `${sourceLesson.id} code caption`,
        );
        if (sourceLesson.checkYourUnderstanding && lesson.checkYourUnderstanding) {
          compareText(
            language,
            sourceLesson.checkYourUnderstanding.question,
            lesson.checkYourUnderstanding.question,
            `${sourceLesson.id} quiz question`,
          );
          sourceLesson.checkYourUnderstanding.options.forEach((option, index) =>
            compareText(
              language,
              option,
              lesson.checkYourUnderstanding?.options[index],
              `${sourceLesson.id} quiz option ${index + 1}`,
            ),
          );
          compareText(
            language,
            sourceLesson.checkYourUnderstanding.explanation,
            lesson.checkYourUnderstanding.explanation,
            `${sourceLesson.id} quiz explanation`,
          );
        }
      });

      if (source.caseStudy && localized.caseStudy) {
        for (const field of [
          'title',
          'scenario',
          'threatDetails',
          'goodReaction',
          'criticalMistake',
        ]) {
          compareText(
            language,
            source.caseStudy[field],
            localized.caseStudy[field],
            `${source.id} case ${field}`,
          );
        }
      }

      source.examQuestions?.forEach((question, index) => {
        const translatedQuestion = localized.examQuestions?.[index];
        compareText(
          language,
          question.text,
          translatedQuestion?.text,
          `${source.id} exam question ${index + 1}`,
        );
        question.options.forEach((option, optionIndex) =>
          compareText(
            language,
            option,
            translatedQuestion?.options[optionIndex],
            `${source.id} exam option ${index + 1}.${optionIndex + 1}`,
          ),
        );
        compareText(
          language,
          question.explanation,
          translatedQuestion?.explanation,
          `${source.id} exam explanation ${index + 1}`,
        );
      });
    }
  }

  assert.deepEqual(untranslated, []);
});

test('le catalogue inclut les parcours DevOps et les modules avancés associés', () => {
  const devopsModules = sourceCourses.filter((course) =>
    /devops|ci\/cd|gitops|kubernetes|sre|observability|infrastructure/i.test(
      `${course.title} ${course.curriculumTrack ?? ''} ${course.description}`,
    ),
  );

  assert.ok(devopsModules.length >= 3, 'au moins 3 modules DevOps doivent être présents');
  assert.ok(devopsModules.some((course) => course.id === 'module-10'));
  assert.ok(devopsModules.some((course) => course.id === 'module-11'));
  assert.ok(devopsModules.some((course) => course.id === 'module-12'));
});

test('les exercices français couvrent les leçons du catalogue', () => {
  const lessonIds = sourceCourses.flatMap((course) => course.lessons.map((lesson) => lesson.id));
  assert.ok(lessonIds.length >= 60, 'le catalogue compte au moins 60 leçons');
  assert.deepEqual(Object.keys(COURSE_EXERCISES_FR).sort(), lessonIds.sort());
  for (const exercise of Object.values(COURSE_EXERCISES_FR)) {
    assert.ok(exercise.title);
    assert.ok(exercise.instructions);
    assert.ok(exercise.expectedOutcome);
  }
});
