import React, { useState, useEffect } from 'react';
import { QuizMode, Question, QuizHistoryEntry, UserPreferences } from '../../types';
import { generateQuizQuestions } from '../../services/geminiService';
import {
  getStats,
  getQuizHistory,
  clearQuizHistory,
  getPreferences,
  savePreferences,
} from '../../services/persistenceService';
import { useI18n } from '../../services/i18n';
import SoloQuiz from './SoloQuiz';
import MultiQuiz from './MultiQuiz';
import { HelpCircle, Users, Sparkles, ArrowLeft, Trophy, Play, Settings2 } from 'lucide-react';

const CyberLoading = ({ progress, lang }: { progress: number; lang: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 space-y-6 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md mx-auto text-center animate-in fade-in">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 border-4 border-sky-500/20 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center font-black text-sky-400 text-sm">
        {Math.round(progress)}%
      </div>
    </div>
    <div>
      <p className="text-white font-extrabold text-base mb-1">Préparation du Quiz...</p>
      <p className="text-xs text-slate-400">Génération des questions adaptées</p>
    </div>
  </div>
);

interface QuizContainerProps {
  onBack: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const [mode, setMode] = useState<QuizMode>(QuizMode.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [count, setCount] = useState(prefs.defaultQuizCount || 10);
  const [difficulty, setDifficulty] = useState(prefs.defaultQuizDifficulty || 'Moyen');

  const [localStats, setLocalStats] = useState(getStats());
  const [history, setHistory] = useState<QuizHistoryEntry[]>(getQuizHistory());

  const startSolo = async (totalRequested: number, diff: string) => {
    setIsLoading(true);
    setLoadingProgress(15);
    setQuestions([]);

    try {
      setLoadingProgress(45);
      const generated = await generateQuizQuestions(totalRequested, diff, language);
      setLoadingProgress(90);

      if (!generated || generated.length === 0) {
        throw new Error('Génération échouée');
      }

      setQuestions(generated);
      setLoadingProgress(100);

      setTimeout(() => {
        setMode(QuizMode.SOLO_PLAY);
        setIsLoading(false);
      }, 400);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      // Fallback questions to guarantee smooth experience
      const fallbackQuestions: Question[] = [
        {
          id: 'fb-1',
          category: 'Mots de passe',
          difficulty: 'Moyen',
          text: 'Quelle est la meilleure façon de créer un mot de passe sécurisé ?',
          options: [
            'Utiliser son prénom et son année de naissance',
            'Utiliser au moins 12 caractères avec lettres, chiffres et symboles',
            'Utiliser le même mot de passe pour tous ses comptes',
            'Noter son mot de passe sur un post-it',
          ],
          correctAnswer: 1,
          explanation:
            'Un bon mot de passe est long, unique et contient un mélange de majuscules, minuscules, chiffres et caractères spéciaux.',
        },
        {
          id: 'fb-2',
          category: 'Phishing',
          difficulty: 'Moyen',
          text: 'Que devez-vous vérifier en priorité avant de cliquer sur un lien dans un e-mail suspect ?',
          options: [
            'Le nom d’affichage de l’expéditeur',
            'L’adresse exacte de l’expéditeur et le domaine du lien (survol sans cliquer)',
            'Le logo de l’entreprise dans l’e-mail',
            'La date et l’heure de réception',
          ],
          correctAnswer: 1,
          explanation:
            'Le nom d’affichage et le logo peuvent être facilement usurpés. Seul le domaine technique réel atteste de la provenance.',
        },
        {
          id: 'fb-3',
          category: '2FA',
          difficulty: 'Facile',
          text: 'Pourquoi la double authentification (2FA) est-elle fortement recommandée ?',
          options: [
            'Elle empêche votre ordinateur de surchauffer',
            'Elle bloque l’accès même si le pirate a deviné votre mot de passe',
            'Elle remplace complètement le mot de passe',
            'Elle accélère le débit de votre connexion Internet',
          ],
          correctAnswer: 1,
          explanation:
            'Le second facteur (code temporaire sur application ou clé physique) protège votre compte même après une fuite de mot de passe.',
        },
        {
          id: 'fb-4',
          category: 'Réseaux',
          difficulty: 'Moyen',
          text: 'Quel est le risque principal lors de l’utilisation d’un réseau Wi-Fi public sans VPN ?',
          options: [
            'Votre batterie se décharge deux fois plus vite',
            'Un cyberattaquant sur le même réseau peut intercepter vos échanges non chiffrés',
            'Votre numéro de téléphone est automatiquement rendu public',
            'L’écran de votre appareil se fige',
          ],
          correctAnswer: 1,
          explanation:
            'Sur un Wi-Fi public ouvert, des écoutes clandestines (Man-in-the-Middle) permettent d’intercepter des données sensibles si la connexion n’est pas blindée.',
        },
        {
          id: 'fb-5',
          category: 'Sauvegardes',
          difficulty: 'Facile',
          text: 'Quelle est la méthode recommandée pour se prémunir d’un ransomware (rançongiciel) ?',
          options: [
            'Payer la rançon immédiatement dès le premier message',
            'Sauvegarder régulièrement ses données sur un support déconnecté (hors ligne)',
            'Éteindre son écran d’ordinateur dès l’alerte',
            'Désactiver l’antivirus pour libérer de la mémoire',
          ],
          correctAnswer: 1,
          explanation:
            'Une sauvegarde déconnectée (règle 3-2-1) permet de restaurer l’intégralité de ses fichiers sains sans jamais céder au chantage des pirates.',
        },
      ];
      setQuestions(fallbackQuestions);
      setMode(QuizMode.SOLO_PLAY);
    }
  };

  if (isLoading) return <CyberLoading progress={loadingProgress} lang={language} />;
  if (mode === QuizMode.SOLO_PLAY)
    return <SoloQuiz questions={questions} onFinish={() => setMode(QuizMode.IDLE)} />;
  if (mode === QuizMode.MULTI_LOBBY || mode === QuizMode.MULTI_PLAY)
    return <MultiQuiz onExit={() => setMode(QuizMode.IDLE)} />;

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 space-y-6 animate-in fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Quiz CyberSens
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Teste tes connaissances et renforce tes réflexes de défense.
        </p>
      </div>

      {/* Main Solo Quiz Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Quiz interactif</h2>
            <p className="text-xs text-slate-400">Évaluation personnalisée de sécurité</p>
          </div>
        </div>

        {/* Count Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Nombre de questions</label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((val) => (
              <button
                key={val}
                onClick={() => setCount(val)}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  count === val
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {val} questions
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Niveau de difficulté</label>
          <div className="grid grid-cols-3 gap-2">
            {['Facile', 'Moyen', 'Difficile'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  difficulty === diff
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => startSolo(count, difficulty)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm shadow-xl shadow-sky-600/30 transition-all active:scale-95"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Lancer le quiz</span>
        </button>
      </div>

      {/* Multiplayer Challenge Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Mode Défi Multijoueur</h3>
            <p className="text-[11px] text-slate-400">Affronte tes collègues ou amis</p>
          </div>
        </div>
        <button
          onClick={() => setMode(QuizMode.MULTI_LOBBY)}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
        >
          Rejoindre
        </button>
      </div>

      {/* Stats Summary */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Quiz réalisés : {history.length}</span>
        </div>
        <span>Moyenne : {localStats.avgScore}%</span>
      </div>
    </div>
  );
};

export default QuizContainer;
