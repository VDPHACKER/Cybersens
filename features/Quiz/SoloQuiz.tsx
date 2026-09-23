import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../../types';
import { saveQuizResult, addPoints } from '../../services/persistenceService';
import { audioService } from '../../services/audioService';
import { useI18n } from '../../services/i18n';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Shield,
  RotateCcw,
} from 'lucide-react';

interface SoloQuizProps {
  questions: Question[];
  onFinish: () => void;
}

const SoloQuiz: React.FC<SoloQuizProps> = ({ questions, onFinish }) => {
  const { t, language } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const q = questions[currentIndex];

  const handleAnswer = (optionIdx: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIdx);
    setIsAnswered(true);

    const isCorrect = optionIdx === q.correctAnswer;
    if (isCorrect) {
      setScore((s) => s + 1);
      addPoints(15);
      audioService.playSuccess();
    } else {
      audioService.playError();
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((c) => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    saveQuizResult({
      date: new Date().toISOString(),
      score: score,
      total: questions.length,
      mode: 'Solo',
      difficulty: q?.difficulty || 'Moyen',
    });
    addPoints(score * 10);
    setShowResult(true);
  };

  if (!q) return null;

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Award className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">Quiz terminé !</h2>
          <p className="text-xs text-slate-400 mt-1">
            {percentage >= 70
              ? 'Excellent score ! Vos réflexes sont solides.'
              : 'Bon entraînement, continuez à vous former !'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
          <div className="text-4xl font-black text-sky-400">
            {score} / {questions.length}
          </div>
          <div className="text-xs font-semibold text-slate-400">
            {percentage}% de réussite • +{score * 25} points d&apos;expérience
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setScore(0);
              setSelectedOption(null);
              setIsAnswered(false);
              setShowResult(false);
            }}
            className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Recommencer le quiz</span>
          </button>

          <button
            onClick={onFinish}
            className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30"
          >
            Retourner aux quiz
          </button>
        </div>
      </div>
    );
  }

  const isSelectedCorrect = selectedOption === q.correctAnswer;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5 animate-in fade-in duration-300">
      {/* Top Header matching Screen 4 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onFinish}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h2 className="text-base font-extrabold text-white">Quiz</h2>

        <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
          Question {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Progress Bar matching Screen 4 */}
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
        <div
          className="h-full bg-sky-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Card matching Screen 4 */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug">{q.text}</h3>
      </div>

      {/* Choice Options matching Screen 4 */}
      <div className="space-y-2.5">
        {q.options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === q.correctAnswer;

          let btnStyle =
            'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-sky-500/50 hover:bg-slate-900';
          let badgeStyle = 'bg-slate-800 text-slate-300';

          if (isAnswered) {
            if (isCorrect) {
              btnStyle =
                'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-900/20';
              badgeStyle = 'bg-emerald-500 text-slate-950 font-black';
            } else if (isSelected) {
              btnStyle = 'bg-rose-950/40 border-rose-500 text-white';
              badgeStyle = 'bg-rose-500 text-white';
            } else {
              btnStyle = 'opacity-40 border-slate-800 text-slate-400';
            }
          }

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleAnswer(idx)}
              className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all text-xs sm:text-sm font-semibold ${btnStyle}`}
            >
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${badgeStyle}`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1 leading-snug">{option}</span>
              {isAnswered && isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner matching Screen 4 */}
      {isAnswered && (
        <div className="space-y-4 animate-in slide-in-from-bottom-3 duration-300">
          <div
            className={`p-4 rounded-2xl border ${
              isSelectedCorrect
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm mb-1.5">
              {isSelectedCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Bonne réponse !</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">Attention !</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">{q.explanation}</p>
          </div>

          {/* Next Button matching Screen 4 */}
          <button
            onClick={nextQuestion}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-sky-600/30 transition-all active:scale-95"
          >
            <span>
              {currentIndex < questions.length - 1 ? 'Question suivante' : 'Voir les résultats'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SoloQuiz;
