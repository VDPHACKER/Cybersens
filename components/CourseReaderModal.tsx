import React, { useState, useEffect, useMemo } from 'react';
import { CourseModule, Certificate, CourseCaseStudy } from '../types';
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
import { NetAcadLabRunner } from './NetAcadLabRunner';

const PASS_THRESHOLD = 70;

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
      utterance.lang = 'fr-FR';
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
          ? 'L’examen de certification est corrigé par le serveur : il nécessite une connexion Internet. Vos réponses restent sélectionnées, réessayez une fois en ligne.'
          : err instanceof ApiError
            ? err.message
            : 'Impossible de corriger l’examen pour le moment.',
      );
    } finally {
      setExamPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-900 dark:text-slate-100 max-h-[94vh] flex flex-col">
        {/* Top NetAcad Navigation & Status Bar */}
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
              <span className="hidden sm:inline">Quitter la salle</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-mono text-[11px] font-black tracking-wider border border-sky-500/30">
                {course.moduleCode || 'NETACAD-SEC'}
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
              title="Écouter la leçon lue à voix haute"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Arrêter</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Synthèse Vocale</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* NetAcad Modern Tab Navigation */}
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
            <span>Manuel de Cours ({course.lessons.length})</span>
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
            <span>Lab Pratique Interactif</span>
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
            <span>Étude de Cas Réel</span>
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
            <span>Examen & Certificat</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1">
          {/* TAB 1: LESSONS (NETACAD-STYLE RICH CURRICULUM) */}
          {activeTab === 'lessons' && (
            <div className="space-y-6">
              {/* Module Header Card with Objectives */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/40 dark:via-blue-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                      {course.moduleCode || 'NETACAD'} • {course.level}
                    </span>
                    <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
                      {course.title}
                    </h2>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.description}
                </p>

                {/* Module Learning Objectives */}
                {course.moduleObjectives && course.moduleObjectives.length > 0 && (
                  <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/40">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      Objectifs d’apprentissage du module :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {course.moduleObjectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
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
                    Plan du cours ({course.lessons.length} sections)
                  </h3>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                    {completedLessons.length} / {course.lessons.length} terminées
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
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
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                          isCurrent
                            ? 'bg-sky-50 border-sky-500 text-sky-950 dark:bg-sky-600/20 dark:border-sky-500 dark:text-white shadow-sm ring-2 ring-sky-500/20'
                            : isDone
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-700/40 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            {lesson.sectionNumber ? `Sec ${lesson.sectionNumber}` : `#${idx + 1}`}
                          </span>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <span className="line-clamp-1 block text-[11px] font-bold">
                          {lesson.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Lesson Reader Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-5 shadow-sm">
                {/* Lesson Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-black font-mono">
                      {currentLesson.sectionNumber
                        ? `Section ${currentLesson.sectionNumber}`
                        : `Leçon ${activeLessonIdx + 1}`}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> {currentLesson.duration}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    Progression du module :{' '}
                    {Math.round((completedLessons.length / course.lessons.length) * 100)}%
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {currentLesson.title}
                </h3>

                {/* Lesson Body Paragraphs */}
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  {currentLesson.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {/* Pro Tip Box (NetAcad Callout) */}
                {currentLesson.proTip && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
                    <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider block mb-0.5 text-amber-800 dark:text-amber-400">
                        Astuce NetAcad Pro :
                      </span>
                      <span>{currentLesson.proTip}</span>
                    </div>
                  </div>
                )}

                {/* Security Alert Box */}
                {currentLesson.securityAlert && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-950 dark:text-rose-200">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider block mb-0.5 text-rose-800 dark:text-rose-400">
                        Alerte de Sécurité Opérationnelle :
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
                      <span className="font-mono text-[10px] text-slate-500">ASCII Topology</span>
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
                        <span>{copiedSnippet ? 'Copié !' : 'Copier'}</span>
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

                {/* Check Your Understanding (Instant Mini-Quiz) */}
                {currentQuiz && (
                  <div className="p-5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 space-y-3">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-black text-xs uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4 text-sky-600" />
                      <span>Vérifiez votre compréhension (+15 XP) :</span>
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
                          Explication pédagogique :
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
                    <span>À retenir pour cette section</span>
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
                    Précédent
                  </button>

                  <button
                    onClick={handleCompleteCurrentLesson}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95"
                  >
                    <span>
                      {activeLessonIdx + 1 < course.lessons.length
                        ? 'Section Suivante (+25 XP)'
                        : 'Accéder au Lab Pratique'}
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
              <NetAcadLabRunner
                lab={course.interactiveLab}
                courseId={course.id}
                onLabCompleted={() => {
                  window.dispatchEvent(
                    new CustomEvent('cyber-notify', {
                      detail: {
                        message: 'Objectif du Lab NetAcad validé avec succès ! (+30 XP)',
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
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Étude d’incident réel en entreprise. Analysez la menace et les erreurs critiques
                    à éviter.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Scénario de l’incident :
                  </span>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic">
                    {practicalCase.scenario}
                  </div>
                </div>

                {practicalCase.threatDetails && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Mode opératoire de l’attaque :
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {practicalCase.threatDetails}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Erreur critique à ne jamais commettre
                    </span>
                    <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                      {practicalCase.criticalMistake}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Réflexe d’expert recommandé
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
                      Examen de Certification Officielle
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Délivré sous la supervision du Directeur Académique VDPHACKER
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Répondez correctement aux questions pour valider votre certification. Un score
                  minimum de {PASS_THRESHOLD}% est requis pour débloquer le certificat officiel
                  vérifiable.
                </p>
              </div>

              {examSubmitted ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-center space-y-5 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-amber-600">
                    <Award className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">
                      {examScore >= PASS_THRESHOLD
                        ? 'Félicitations ! Examen Validé'
                        : 'Score insuffisant pour la certification'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Votre score final :{' '}
                      <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                        {examScore}%
                      </span>{' '}
                      (Seuil requis : {PASS_THRESHOLD}%)
                    </p>
                  </div>

                  {examScore >= PASS_THRESHOLD ? (
                    <div className="space-y-3">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                        Votre certificat officiel signé par VDPHACKER a été généré et archivé dans
                        votre profil !
                      </p>
                      <button
                        onClick={() => earnedCertificate && setIssuedCertificate(earnedCertificate)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-amber-500/20 transition-all"
                      >
                        Consulter / Imprimer mon Certificat
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setExamSubmitted(false);
                        setExamAnswers({});
                        setExamAttempt((a) => a + 1);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-md hover:bg-sky-500 transition-colors"
                    >
                      Recommencer l’examen
                    </button>
                  )}

                  {/* Correction détaillée : chaque question avec la bonne réponse et son explication */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3 text-left">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                      Correction détaillée
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
                              Votre réponse : {q.options[examAnswers[idx]]}
                            </p>
                          )}
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 pl-6 font-semibold">
                            Bonne réponse : {q.options[q.correct]}
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
                      className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm"
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
                                  ? 'bg-sky-600 border-sky-600 text-white'
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
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all"
                  >
                    {examPending
                      ? 'Correction en cours…'
                      : 'Soumettre mes réponses & Obtenir ma certification'}
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
