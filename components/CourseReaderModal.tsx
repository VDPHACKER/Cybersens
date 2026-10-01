import React, { useState, useEffect, useMemo } from 'react';
import { CourseModule, Certificate, CourseCaseStudy, Language } from '../types';
import {
  ArrowLeft,
  CheckCircle2,
  Award,
  Clock,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Terminal,
  Code2,
  Copy,
  Check,
  Layers,
  ShieldAlert,
  Lightbulb,
  XCircle,
} from 'lucide-react';
import {
  addPoints,
  saveCertificate,
  getCompletedLessons,
  markLessonCompleted,
  setLocalPoints,
} from '../services/persistenceService';
import { api, ApiError } from '../services/apiClient';
import { CertificateModal } from './CertificateModal';
import { CyberSensLabRunner } from './CyberSensLabRunner';
import { useI18n } from '../services/i18n';

const PASS_THRESHOLD = 70;

const COURSE_READER_COPY: Record<Language, Record<string, string>> = {
  fr: {
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    exit: 'Quitter la salle',
    listen: 'Synthèse vocale',
    stop: 'Arrêter',
    manual: 'Manuel de cours',
    lab: 'Laboratoire pratique interactif',
    case: 'Étude de cas réel',
    exam: 'Examen & certificat',
    objectives: 'Objectifs d’apprentissage du module :',
    coursePlan: 'Plan du cours',
    sections: 'sections',
    completed: 'terminées',
    section: 'Section',
    lesson: 'Leçon',
    progress: 'Progression du module :',
    tip: 'Astuce pratique :',
    alert: 'Alerte de sécurité :',
    diagramLabel: 'Schéma ASCII',
    exercise: 'À vous de pratiquer',
    instructions: 'Consigne',
    expectedOutcome: 'Résultat attendu',
    quiz: 'Vérifiez votre compréhension (+15 XP) :',
    explanation: 'Explication pédagogique :',
    takeaways: 'À retenir pour cette section',
    previous: 'Précédent',
    next: 'Section suivante (+25 XP)',
    goLab: 'Accéder au laboratoire pratique',
    labComplete: 'Objectif du laboratoire validé ! (+30 XP)',
    caseIntro: 'Analysez la menace et les erreurs critiques à éviter.',
    scenario: 'Scénario de l’incident :',
    attack: 'Mode opératoire de l’attaque :',
    mistake: 'Erreur critique à éviter',
    reaction: 'Réflexe recommandé',
    examTitle: 'Examen de certification',
    issuer: 'Délivré sous la supervision du Formateur en cybersécurité et IA VDPHACKER',
    passRule: 'Un score minimum de',
    required: 'est requis pour obtenir le certificat vérifiable.',
    congratulations: 'Félicitations ! Examen validé',
    insufficient: 'Score insuffisant pour la certification',
    finalScore: 'Votre score final :',
    threshold: 'Seuil requis :',
    certificateReady: 'Votre certificat officiel a été généré et archivé dans votre profil.',
    certificateAction: 'Consulter / Imprimer mon certificat',
    retry: 'Recommencer l’examen',
    correction: 'Correction détaillée',
    yourAnswer: 'Votre réponse :',
    correctAnswer: 'Bonne réponse :',
    question: 'Question',
    submit: 'Valider mes réponses',
    submitCertificate: 'Soumettre mes réponses & obtenir ma certification',
    submitting: 'Correction en cours…',
    copy: 'Copier',
    copied: 'Copié !',
    examOffline:
      'La correction nécessite une connexion Internet. Vos réponses restent sélectionnées; réessayez une fois en ligne.',
    examError: 'Impossible de corriger l’examen pour le moment.',
  },
  en: {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    exit: 'Leave course',
    listen: 'Listen to lesson',
    stop: 'Stop',
    manual: 'Course guide',
    lab: 'Interactive hands-on lab',
    case: 'Real-world case study',
    exam: 'Exam & certificate',
    objectives: 'Module learning objectives:',
    coursePlan: 'Course outline',
    sections: 'sections',
    completed: 'completed',
    section: 'Section',
    lesson: 'Lesson',
    progress: 'Module progress:',
    tip: 'Practical tip:',
    alert: 'Security alert:',
    diagramLabel: 'ASCII diagram',
    exercise: 'Put it into practice',
    instructions: 'Instructions',
    expectedOutcome: 'Expected outcome',
    quiz: 'Check your understanding (+15 XP):',
    explanation: 'Explanation:',
    takeaways: 'Key takeaways',
    previous: 'Previous',
    next: 'Next section (+25 XP)',
    goLab: 'Open the hands-on lab',
    labComplete: 'Lab objective completed! (+30 XP)',
    caseIntro: 'Analyze the threat and the critical mistakes to avoid.',
    scenario: 'Incident scenario:',
    attack: 'Attack method:',
    mistake: 'Critical mistake to avoid',
    reaction: 'Recommended response',
    examTitle: 'Certification exam',
    issuer: 'Issued under the supervision of Cybersecurity & AI Trainer VDPHACKER',
    passRule: 'A minimum score of',
    required: 'is required to earn the verifiable certificate.',
    congratulations: 'Congratulations! Exam passed',
    insufficient: 'Score too low for certification',
    finalScore: 'Your final score:',
    threshold: 'Required score:',
    certificateReady: 'Your official certificate has been generated and saved to your profile.',
    certificateAction: 'View / Print my certificate',
    retry: 'Retake the exam',
    correction: 'Answer review',
    yourAnswer: 'Your answer:',
    correctAnswer: 'Correct answer:',
    question: 'Question',
    submit: 'Submit answers',
    submitCertificate: 'Submit answers & earn my certificate',
    submitting: 'Grading…',
    copy: 'Copy',
    copied: 'Copied!',
    examOffline:
      'Grading requires an internet connection. Your answers are saved; try again when you are online.',
    examError: 'Unable to grade the exam right now.',
  },
  es: {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    exit: 'Salir del curso',
    listen: 'Escuchar la lección',
    stop: 'Detener',
    manual: 'Guía del curso',
    lab: 'Laboratorio práctico interactivo',
    case: 'Caso práctico real',
    exam: 'Examen y certificado',
    objectives: 'Objetivos de aprendizaje del módulo:',
    coursePlan: 'Índice del curso',
    sections: 'secciones',
    completed: 'completadas',
    section: 'Sección',
    lesson: 'Lección',
    progress: 'Progreso del módulo:',
    tip: 'Consejo práctico:',
    alert: 'Alerta de seguridad:',
    diagramLabel: 'Diagrama ASCII',
    exercise: 'Ponlo en práctica',
    instructions: 'Instrucciones',
    expectedOutcome: 'Resultado esperado',
    quiz: 'Comprueba lo aprendido (+15 XP):',
    explanation: 'Explicación:',
    takeaways: 'Puntos clave de esta sección',
    previous: 'Anterior',
    next: 'Siguiente sección (+25 XP)',
    goLab: 'Ir al laboratorio práctico',
    labComplete: '¡Objetivo del laboratorio completado! (+30 XP)',
    caseIntro: 'Analiza la amenaza y los errores críticos que debes evitar.',
    scenario: 'Escenario del incidente:',
    attack: 'Método del ataque:',
    mistake: 'Error crítico que debes evitar',
    reaction: 'Respuesta recomendada',
    examTitle: 'Examen de certificación',
    issuer: 'Emitido bajo la supervisión del Formador en Ciberseguridad e IA VDPHACKER',
    passRule: 'Se requiere una puntuación mínima de',
    required: 'para obtener el certificado verificable.',
    congratulations: '¡Enhorabuena! Examen aprobado',
    insufficient: 'Puntuación insuficiente para certificarte',
    finalScore: 'Tu puntuación final:',
    threshold: 'Puntuación mínima:',
    certificateReady: 'Tu certificado oficial se ha generado y guardado en tu perfil.',
    certificateAction: 'Ver / Imprimir mi certificado',
    retry: 'Repetir el examen',
    correction: 'Revisión detallada',
    yourAnswer: 'Tu respuesta:',
    correctAnswer: 'Respuesta correcta:',
    question: 'Pregunta',
    submit: 'Enviar respuestas',
    submitCertificate: 'Enviar respuestas y obtener mi certificado',
    submitting: 'Corrigiendo…',
    copy: 'Copiar',
    copied: '¡Copiado!',
    examOffline:
      'La corrección requiere conexión a Internet. Tus respuestas se conservan; inténtalo de nuevo cuando estés conectado.',
    examError: 'No se pudo corregir el examen en este momento.',
  },
};

interface ExamItem {
  id: string;
  text: string;
  options: string[];
  originalOptions: string[]; // ordre d'origine, utilisé pour envoyer les réponses au serveur
  correct: number;
  explanation: string;
}

interface ExamResponse {
  score: number;
  passed: boolean;
  certificate: Certificate | null;
  points: number;
}

// Mélange déterministe des options : la bonne réponse ne se trouve plus toujours au même endroit
const hashSeed = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const shuffleOptions = (options: string[], correct: number, seed: string) => {
  let state = hashSeed(seed) || 1;
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    state = (state ^ (state >>> 13)) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), correct: order.indexOf(correct) };
};

const FALLBACK_CASE: CourseCaseStudy = {
  title: 'Cas Concret d’Incident en Entreprise',
  scenario:
    '« Un employé reçoit un appel d’un prétendu superviseur réseau d’Orange Money ou du support technique interne. L’interlocuteur affirme qu’un transfert erroné est bloqué et qu’il faut valider une requête immédiatement avec son code d’authentification pour annuler l’opération. »',
  threatDetails:
    'Ingénierie sociale par téléphone (vishing) combinant autorité supposée et urgence artificielle pour obtenir un code d’authentification.',
  criticalMistake:
    'Valider l’invite d’authentification ou transmettre son code confidentiel sous l’effet de l’urgence feinte.',
  goodReaction:
    'Raccrocher calmement. Contacter le service officiel via les coordonnées internes répertoriées pour signaler la tentative d’escroquerie.',
};

interface CourseReaderModalProps {
  course: CourseModule | null;
  onClose: () => void;
  onComplete?: () => void;
}

export const CourseReaderModal: React.FC<CourseReaderModalProps> = ({ course, ...props }) =>
  course ? <CourseReader key={course.id} course={course} {...props} /> : null;

const CourseReader: React.FC<Omit<CourseReaderModalProps, 'course'> & { course: CourseModule }> = ({
  course,
  onClose,
  onComplete,
}) => {
  const { language } = useI18n();
  const text = COURSE_READER_COPY[language];
  const [activeTab, setActiveTab] = useState<'lessons' | 'lab' | 'cas_pratique' | 'evaluation'>(
    'lessons',
  );
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<number[]>(() => {
    const done = getCompletedLessons(course.id);
    return course.lessons.map((l, i) => (done.includes(l.id) ? i : -1)).filter((i) => i >= 0);
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [issuedCertificate, setIssuedCertificate] = useState<Certificate | null>(null);

  // Lesson Check Your Understanding state
  const [lessonQuizAnswers, setLessonQuizAnswers] = useState<Record<string, number>>({});
  const [lessonQuizFeedback, setLessonQuizFeedback] = useState<Record<string, boolean>>({});
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Mini-Evaluation State for Certification
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScore, setExamScore] = useState<number>(0);
  const [examAttempt, setExamAttempt] = useState(0);
  const [earnedCertificate, setEarnedCertificate] = useState<Certificate | null>(null);
  const [examPending, setExamPending] = useState(false);
  const [examError, setExamError] = useState('');

  // Examen du module ; à défaut, les quiz des leçons servent de questions d'examen
  const examQuestions: ExamItem[] = useMemo(() => {
    const source: ExamItem[] = course.examQuestions?.length
      ? course.examQuestions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options,
          originalOptions: q.options,
          correct: q.correctAnswer,
          explanation: q.explanation,
        }))
      : course.lessons
          .filter((l) => l.checkYourUnderstanding)
          .map((l) => ({
            id: l.id,
            text: l.checkYourUnderstanding!.question,
            options: l.checkYourUnderstanding!.options,
            originalOptions: l.checkYourUnderstanding!.options,
            correct: l.checkYourUnderstanding!.correct,
            explanation: l.checkYourUnderstanding!.explanation,
          }));
    return source.map((q) => ({
      ...q,
      ...shuffleOptions(q.options, q.correct, `${q.id}#${examAttempt}`),
    }));
  }, [course, examAttempt]);

  const practicalCase = course.caseStudy || FALLBACK_CASE;

  const currentLesson = course.lessons[activeLessonIdx] || course.lessons[0];
  const currentQuiz = useMemo(() => {
    const cyu = currentLesson.checkYourUnderstanding;
    return cyu ? { ...cyu, ...shuffleOptions(cyu.options, cyu.correct, currentLesson.id) } : null;
  }, [currentLesson]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert("La synthèse vocale n'est pas supportée sur ce navigateur.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${currentLesson.title}. ${currentLesson.content.join(' ')}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCompleteCurrentLesson = () => {
    if (!completedLessons.includes(activeLessonIdx)) {
      setCompletedLessons((prev) => [...prev, activeLessonIdx]);
      // Les XP ne sont accordés qu'une seule fois par leçon, même après réouverture du cours
      if (markLessonCompleted(course.id, currentLesson.id)) addPoints(25);
    }

    if (activeLessonIdx + 1 < course.lessons.length) {
      setActiveLessonIdx(activeLessonIdx + 1);
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } else {
      setActiveTab('lab');
    }
  };

  const handleAnswerLessonQuiz = (optionIdx: number) => {
    if (!currentQuiz) return;
    const lessonKey = currentLesson.id;
    setLessonQuizAnswers((prev) => ({ ...prev, [lessonKey]: optionIdx }));
    setLessonQuizFeedback((prev) => ({ ...prev, [lessonKey]: true }));

    if (optionIdx === currentQuiz.correct) {
      addPoints(15);
    }
  };

  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Correction par le serveur : lui seul délivre et signe les certificats
  const handleSubmitExam = async () => {
    setExamError('');
    setExamPending(true);
    try {
      const answers = Object.fromEntries(
        examQuestions.map((q, idx) => [
          q.id,
          q.originalOptions.indexOf(q.options[examAnswers[idx]]),
        ]),
      );
      const result = await api<ExamResponse>('POST', '/api/exams', {
        courseId: course.id,
        answers,
      });
      setExamScore(result.score);
      setExamSubmitted(true);
      setLocalPoints(result.points);
      if (result.passed && result.certificate) {
        saveCertificate(result.certificate);
        setIssuedCertificate(result.certificate);
        setEarnedCertificate(result.certificate);
        if (onComplete) onComplete();
      }
    } catch (err) {
      setExamError(
        err instanceof ApiError && err.status === 0
          ? text.examOffline
          : err instanceof ApiError
            ? err.message
            : text.examError,
      );
    } finally {
      setExamPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-900 dark:text-slate-100 max-h-[94vh] flex flex-col">
        {/* Top CyberSens Navigation & Status Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isSpeaking) window.speechSynthesis.cancel();
                onClose();
              }}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{text.exit}</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-mono text-[11px] font-black tracking-wider border border-sky-500/30">
                {course.moduleCode || 'CS-SEC'}
              </span>
              <span className="text-xs text-slate-400 hidden md:inline truncate max-w-xs">
                {course.curriculumTrack || 'Cursus Certifiant'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{course.duration}</span>
            </div>

            <button
              onClick={toggleSpeech}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isSpeaking
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-sky-500'
              }`}
              title={text.listen}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{text.stop}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">{text.listen}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CyberSens Modern Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 text-xs font-bold gap-4 overflow-x-auto no-scrollbar shadow-sm">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'lessons'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>
              {text.manual} ({course.lessons.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'lab'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-500" />
            <span>{text.lab}</span>
          </button>

          <button
            onClick={() => setActiveTab('cas_pratique')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'cas_pratique'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{text.case}</span>
          </button>

          <button
            onClick={() => setActiveTab('evaluation')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'evaluation'
                ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>{text.exam}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1">
          {/* TAB 1: LESSONS (CS-STYLE RICH CURRICULUM) */}
          {activeTab === 'lessons' && (
            <div className="space-y-6">
              {/* Module Header Card with Objectives */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/40 dark:via-blue-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                      {course.moduleCode || 'CS'} •{' '}
                      {course.level === 'Débutant'
                        ? text.beginner
                        : course.level === 'Intermédiaire'
                          ? text.intermediate
                          : text.advanced}
                    </span>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {course.title}
                    </h2>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-7">
                  {course.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700 dark:border-sky-700 dark:bg-sky-950/20 dark:text-sky-300">
                    {course.lessons.length} leçons
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                    {course.caseStudy ? 'Cas pratique' : 'Guide'}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                    Certification
                  </span>
                </div>

                {/* Module Learning Objectives */}
                {course.moduleObjectives && course.moduleObjectives.length > 0 && (
                  <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/40">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      {text.objectives}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                      {course.moduleObjectives.map((obj, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/40 p-2 dark:border-sky-900 dark:bg-sky-950/10"
                        >
                          <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Chapter Navigator */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {text.coursePlan} ({course.lessons.length} {text.sections})
                  </h3>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                    {completedLessons.length} / {course.lessons.length} {text.completed}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {course.lessons.map((lesson, idx) => {
                    const isCurrent = idx === activeLessonIdx;
                    const isDone = completedLessons.includes(idx);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setActiveLessonIdx(idx);
                          if (isSpeaking) {
                            window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all text-sm font-semibold ${
                          isCurrent
                            ? 'bg-sky-50 border-sky-500 text-sky-950 dark:bg-sky-600/20 dark:border-sky-500 dark:text-white shadow-sm ring-2 ring-sky-500/20'
                            : isDone
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-700/40 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            {lesson.sectionNumber
                              ? `${text.section} ${lesson.sectionNumber}`
                              : `#${idx + 1}`}
                          </span>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <span className="line-clamp-1 block text-[12px] sm:text-sm font-bold">
                          {lesson.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Lesson Reader Card */}
              <div className="course-reader-content p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
                {/* Lesson Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-black font-mono">
                      {currentLesson.sectionNumber
                        ? `${text.section} ${currentLesson.sectionNumber}`
                        : `${text.lesson} ${activeLessonIdx + 1}`}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {currentLesson.duration}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    {text.progress}{' '}
                    {Math.round((completedLessons.length / course.lessons.length) * 100)}%
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {currentLesson.title}
                </h3>

                {/* Lesson Body Paragraphs */}
                <div className="space-y-5 text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-7 font-normal">
                  {currentLesson.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {/* Pro Tip Box (CyberSens Callout) */}
                {currentLesson.proTip && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-sm text-amber-950 dark:text-amber-200 leading-6">
                    <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider block mb-0.5 text-amber-800 dark:text-amber-400">
                        {text.tip}
                      </span>
                      <span>{currentLesson.proTip}</span>
                    </div>
                  </div>
                )}

                {/* Security Alert Box */}
                {currentLesson.securityAlert && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-sm text-rose-950 dark:text-rose-200 leading-6">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider block mb-0.5 text-rose-800 dark:text-rose-400">
                        {text.alert}
                      </span>
                      <span>{currentLesson.securityAlert}</span>
                    </div>
                  </div>
                )}

                {/* Network / Architecture ASCII Diagram */}
                {currentLesson.diagramAscii && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold flex items-center gap-1.5 text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        {currentLesson.diagramTitle || 'Schéma d’Architecture & Flux Réseau'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {text.diagramLabel}
                      </span>
                    </div>
                    <pre className="p-4 text-[11px] sm:text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed select-text">
                      {currentLesson.diagramAscii}
                    </pre>
                  </div>
                )}

                {/* Code Snippet Box */}
                {currentLesson.codeSnippet && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono font-bold text-sky-400 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" />
                        {currentLesson.codeSnippet.language.toUpperCase()}
                      </span>
                      <button
                        onClick={() => copyCodeToClipboard(currentLesson.codeSnippet!.code)}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copiedSnippet ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedSnippet ? text.copied : text.copy}</span>
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] sm:text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed select-text">
                      {currentLesson.codeSnippet.code}
                    </pre>
                    {currentLesson.codeSnippet.caption && (
                      <div className="px-4 py-1.5 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                        {currentLesson.codeSnippet.caption}
                      </div>
                    )}
                  </div>
                )}

                {currentLesson.practicalExercise && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      {text.exercise}: {currentLesson.practicalExercise.title}
                    </h4>
                    <p className="text-xs text-emerald-950 dark:text-emerald-100 leading-relaxed">
                      <strong>{text.instructions}: </strong>
                      {currentLesson.practicalExercise.instructions}
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      <strong>{text.expectedOutcome}: </strong>
                      {currentLesson.practicalExercise.expectedOutcome}
                    </p>
                  </div>
                )}

                {/* Check Your Understanding (Instant Mini-Quiz) */}
                {currentQuiz && (
                  <div className="p-5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 space-y-3">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-black text-xs uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4 text-sky-600" />
                      <span>{text.quiz}</span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {currentQuiz.question}
                    </p>

                    <div className="space-y-2">
                      {currentQuiz.options.map((opt, oIdx) => {
                        const isAnswered = lessonQuizFeedback[currentLesson.id];
                        const isSelected = lessonQuizAnswers[currentLesson.id] === oIdx;
                        const isCorrect = oIdx === currentQuiz.correct;

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleAnswerLessonQuiz(oIdx)}
                            disabled={isAnswered}
                            className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                              isAnswered
                                ? isCorrect
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                  : isSelected
                                    ? 'bg-rose-100 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200'
                                    : 'opacity-50 border-slate-200 dark:border-slate-800'
                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {lessonQuizFeedback[currentLesson.id] && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <span className="font-bold text-sky-600 block mb-0.5">
                          {text.explanation}
                        </span>
                        {currentQuiz.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Key Takeaways */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>{text.takeaways}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {currentLesson.keyTakeaways.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <span className="text-sky-500 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next / Completion Navigation Buttons */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (activeLessonIdx > 0) {
                        setActiveLessonIdx(activeLessonIdx - 1);
                        if (isSpeaking) window.speechSynthesis.cancel();
                      }
                    }}
                    disabled={activeLessonIdx === 0}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    {text.previous}
                  </button>

                  <button
                    onClick={handleCompleteCurrentLesson}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95"
                  >
                    <span>
                      {activeLessonIdx + 1 < course.lessons.length ? text.next : text.goLab}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE LAB (HANDS-ON SIMULATION) */}
          {activeTab === 'lab' && (
            <div className="space-y-4">
              <CyberSensLabRunner
                lab={course.interactiveLab}
                courseId={course.id}
                language={language}
                onLabCompleted={() => {
                  window.dispatchEvent(
                    new CustomEvent('cyber-notify', {
                      detail: {
                        message: text.labComplete,
                        type: 'success',
                      },
                    }),
                  );
                }}
              />
            </div>
          )}

          {/* TAB 3: ÉTUDE DE CAS RÉEL */}
          {activeTab === 'cas_pratique' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3 text-amber-900 dark:text-amber-200">
                <Sparkles className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">{practicalCase.title}</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{text.caseIntro}</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {text.scenario}
                  </span>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic">
                    {practicalCase.scenario}
                  </div>
                </div>

                {practicalCase.threatDetails && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {text.attack}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {practicalCase.threatDetails}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> {text.mistake}
                    </span>
                    <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                      {practicalCase.criticalMistake}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {text.reaction}
                    </span>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      {practicalCase.goodReaction}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ÉVALUATION OFFICIELLE & CERTIFICAT */}
          {activeTab === 'evaluation' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 border border-amber-300/40 dark:border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {text.examTitle}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {text.issuer}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {text.passRule} {PASS_THRESHOLD}% {text.required}
                </p>
              </div>

              {examSubmitted ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center space-y-5 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-amber-600">
                    <Award className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      {examScore >= PASS_THRESHOLD ? text.congratulations : text.insufficient}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {text.finalScore}{' '}
                      <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                        {examScore}%
                      </span>{' '}
                      ({text.threshold} {PASS_THRESHOLD}%)
                    </p>
                  </div>

                  {examScore >= PASS_THRESHOLD ? (
                    <div className="space-y-3">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                        {text.certificateReady}
                      </p>
                      <button
                        onClick={() => earnedCertificate && setIssuedCertificate(earnedCertificate)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-amber-500/20 transition-all"
                      >
                        {text.certificateAction}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setExamSubmitted(false);
                        setExamAnswers({});
                        setExamAttempt((a) => a + 1);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-sky-700 text-white text-xs font-bold shadow-md hover:bg-sky-600 transition-colors"
                    >
                      {text.retry}
                    </button>
                  )}

                  {/* Correction détaillée : chaque question avec la bonne réponse et son explication */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3 text-left">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                      {text.correction}
                    </span>
                    {examQuestions.map((q, idx) => {
                      const isRight = examAnswers[idx] === q.correct;
                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-xl border space-y-1.5 ${
                            isRight
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
                          }`}
                        >
                          <div className="flex items-start gap-2 text-xs font-bold text-slate-900 dark:text-white">
                            {isRight ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <span>
                              {idx + 1}. {q.text}
                            </span>
                          </div>
                          {!isRight && (
                            <p className="text-xs text-rose-800 dark:text-rose-300 pl-6">
                              {text.yourAnswer} {q.options[examAnswers[idx]]}
                            </p>
                          )}
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 pl-6 font-semibold">
                            {text.correctAnswer} {q.options[q.correct]}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 pl-6">
                            {q.explanation}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {examQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm"
                    >
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400 block">
                        Question {idx + 1} / {examQuestions.length}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {q.text}
                      </h4>
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            onClick={() => setExamAnswers((prev) => ({ ...prev, [idx]: oIdx }))}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-2.5 ${
                              examAnswers[idx] === oIdx
                                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-200 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                examAnswers[idx] === oIdx
                                  ? 'bg-sky-700 border-sky-600 text-white'
                                  : 'border-slate-400'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </div>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {examError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-200"
                    >
                      {examError}
                    </div>
                  )}
                  <button
                    onClick={handleSubmitExam}
                    disabled={examPending || Object.keys(examAnswers).length < examQuestions.length}
                    className="w-full py-3 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all"
                  >
                    {examPending ? text.submitting : text.submitCertificate}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Certificate Display Modal when issued */}
        {issuedCertificate && (
          <CertificateModal
            certificate={issuedCertificate}
            onClose={() => setIssuedCertificate(null)}
          />
        )}
      </div>
    </div>
  );
};
