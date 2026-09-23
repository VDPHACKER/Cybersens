// Accès côté serveur aux données des cours (source unique : services/*CoursesData.ts).
// Sert à valider la progression et à corriger les examens sans faire confiance au navigateur.
import { COMPREHENSIVE_COURSE_MODULES } from '../services/coursesData.ts';
import { ADVANCED_COURSE_MODULES } from '../services/advancedCoursesData.ts';

const COURSES = new Map(
  [...COMPREHENSIVE_COURSE_MODULES, ...ADVANCED_COURSE_MODULES].map((m) => [m.id, m]),
);

export const getCourse = (courseId) => COURSES.get(courseId);

export const isValidLesson = (courseId, lessonId) =>
  !!COURSES.get(courseId)?.lessons.some((l) => l.id === lessonId);

export const PASS_THRESHOLD = 70;

/**
 * Corrige un examen. answers : { [questionId]: index de l'option dans l'ordre d'origine }.
 * Retourne null si le module n'a pas d'examen.
 */
export const gradeExam = (courseId, answers) => {
  const questions = COURSES.get(courseId)?.examQuestions;
  if (!questions?.length) return null;
  const correct = questions.filter((q) => answers?.[q.id] === q.correctAnswer).length;
  const score = Math.round((correct / questions.length) * 100);
  return { score, correct, total: questions.length, passed: score >= PASS_THRESHOLD };
};
