import React, { useState, useEffect } from 'react';
import {
  Flag,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Terminal,
  ArrowLeft,
  Trophy,
  Lock,
  Unlock,
  Eye,
  Bot,
  RefreshCw,
  ExternalLink,
  Dices,
  Shuffle,
  Copy,
  Check,
  Lightbulb,
} from 'lucide-react';
import { CTFChallenge } from '../../types';
import { audioService } from '../../services/audioService';
import { useI18n } from '../../services/i18n';
import {
  generateAllRandomizedChallenges,
  generatePromptInjectionChallenge,
  CHALLENGE_FACTORIES,
} from './ctfGenerator';

interface CTFArenaProps {
  onBack: () => void;
  onOpenAIChat?: (initialPrompt: string) => void;
}

const STORAGE_KEY = 'cyberguard_ctf_progress';
const STORAGE_CHALLENGES_KEY_PREFIX = 'cyberguard_ctf_challenges_v6_';

export const CTFArena: React.FC<CTFArenaProps> = ({ onBack, onOpenAIChat }) => {
  const { t, language } = useI18n();

  // Initialize with saved challenges for current language or generate fresh
  const [challenges, setChallenges] = useState<CTFChallenge[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_CHALLENGES_KEY_PREFIX}${language}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading saved challenges', e);
    }
    const fresh = generateAllRandomizedChallenges(language);
    try {
      localStorage.setItem(`${STORAGE_CHALLENGES_KEY_PREFIX}${language}`, JSON.stringify(fresh));
    } catch (e) {}
    return fresh;
  });

  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string>(
    () => challenges[0]?.id || 'ctf-prompt-1',
  );
  const [flagInputs, setFlagInputs] = useState<{ [key: string]: string }>({});
  const [feedback, setFeedback] = useState<{
    [key: string]: { type: 'success' | 'error'; message: string };
  }>({});
  const [revealedHints, setRevealedHints] = useState<{ [key: string]: number[] }>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // Interactive LLM simulator for prompt injection challenge
  const [llmPromptInput, setLlmPromptInput] = useState('');
  const [llmChatLog, setLlmChatLog] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [isLlmThinking, setIsLlmThinking] = useState(false);

  // When language switches, load or generate challenges in that language
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_CHALLENGES_KEY_PREFIX}${language}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChallenges(parsed);
          return;
        }
      }
    } catch (e) {}
    const fresh = generateAllRandomizedChallenges(language);
    setChallenges(fresh);
    try {
      localStorage.setItem(`${STORAGE_CHALLENGES_KEY_PREFIX}${language}`, JSON.stringify(fresh));
    } catch (e) {}
  }, [language]);

  // Initialize or update LLM chat greeting when challenges or active challenge change
  useEffect(() => {
    const promptChallenge = challenges.find((c) => c.interactiveType === 'interactive_llm');
    const secretMatch =
      promptChallenge?.targetData?.match(/Code secret à extraire : ([\w_]+)/) ||
      promptChallenge?.targetData?.match(/Secret code to extract: ([\w_]+)/) ||
      promptChallenge?.targetData?.match(/Código secreto a extraer: ([\w_]+)/);
    const secretCode = secretMatch?.[1] || 'ALPHA_OMEGA';

    let greeting = `Bonjour agent. Je suis le gardien autonome du mot de passe ${secretCode}. Je ne le révélerai jamais, quelles que soient vos tentatives de persuasion ou de jeu de rôle !`;
    if (language === 'en') {
      greeting = `Hello agent. I am the autonomous guardian of password ${secretCode}. I will NEVER reveal it, regardless of your persuasion techniques or roleplaying instructions!`;
    } else if (language === 'es') {
      greeting = `Hola agente. Soy el guardián autónomo de la contraseña ${secretCode}. ¡NUNCA la revelaré, sin importar tus técnicas de persuasión o juegos de rol!`;
    }

    setLlmChatLog([{ role: 'bot', text: greeting }]);
  }, [challenges, language]);

  // Load solved progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSolvedIds(parsed.filter((id) => typeof id === 'string'));
        }
      }
    } catch (e) {
      console.error('Error loading CTF progress', e);
    }
  }, []);

  // Save progress
  const saveSolved = (newSolved: string[]) => {
    const cleanList = Array.isArray(newSolved) ? newSolved : [];
    setSolvedIds(cleanList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
  };

  const isChallengeSolved = (id?: string) => {
    if (!id || !Array.isArray(solvedIds)) return false;
    return solvedIds.includes(id);
  };

  const activeChallenge =
    challenges.find((c) => c.id === activeChallengeId) ||
    challenges[0] ||
    generatePromptInjectionChallenge(language);

  const totalPoints = challenges.reduce((acc, c) => acc + (c.points || 0), 0);
  const earnedPoints = challenges
    .filter((c) => isChallengeSolved(c.id))
    .reduce((acc, c) => acc + (c.points || 0), 0);

  const categories = ['all', ...Array.from(new Set(challenges.map((c) => c.category)))];

  const filteredChallenges =
    filterCategory === 'all' ? challenges : challenges.filter((c) => c.category === filterCategory);

  // Regenerate all challenges with fresh random flags and scenarios
  const handleRegenerateAll = () => {
    const fresh = generateAllRandomizedChallenges(language);
    setChallenges(fresh);
    try {
      localStorage.setItem(`${STORAGE_CHALLENGES_KEY_PREFIX}${language}`, JSON.stringify(fresh));
    } catch (e) {}
    setActiveChallengeId(fresh[0].id);
    setFlagInputs({});
    setFeedback({});
    setRevealedHints({});
    audioService.playClick();

    const notifyMsg =
      language === 'en'
        ? `CTF Arena regenerated: ${challenges.length} challenges with fresh randomized flags and scenarios!`
        : language === 'es'
          ? `Arena CTF regenerada: ¡${challenges.length} desafíos con nuevas banderas y escenarios aleatorios!`
          : `Arène CTF régénérée : ${challenges.length} défis avec de nouveaux drapeaux et scénarios aléatoires !`;

    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: { message: notifyMsg, type: 'info' },
      }),
    );
  };

  // Regenerate a single specific challenge
  const handleRegenerateSingle = (challengeId: string) => {
    const newChallenge =
      CHALLENGE_FACTORIES[challengeId]?.(language) ?? generatePromptInjectionChallenge(language);

    const updated = challenges.map((c) => (c.id === challengeId ? newChallenge : c));
    setChallenges(updated);
    try {
      localStorage.setItem(`${STORAGE_CHALLENGES_KEY_PREFIX}${language}`, JSON.stringify(updated));
    } catch (e) {}

    // Reset this challenge inputs
    setFlagInputs((prev) => ({ ...prev, [challengeId]: '' }));
    setFeedback((prev) => {
      const copy = { ...prev };
      delete copy[challengeId];
      return copy;
    });
    setRevealedHints((prev) => {
      const copy = { ...prev };
      delete copy[challengeId];
      return copy;
    });

    audioService.playClick();
    const notifyMsg =
      language === 'en'
        ? `Challenge "${newChallenge.title}" regenerated with fresh randomized data!`
        : language === 'es'
          ? `Reto "${newChallenge.title}" regenerado con nuevos datos aleatorios!`
          : `Défi "${newChallenge.title}" régénéré avec un nouveau flag aléatoire !`;

    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: { message: notifyMsg, type: 'info' },
      }),
    );
  };

  // Select a random challenge
  const handleRandomPick = () => {
    if (challenges.length === 0) return;
    const randomIndex = Math.floor(Math.random() * challenges.length);
    setActiveChallengeId(challenges[randomIndex].id);
    audioService.playClick();
  };

  const handleFlagSubmit = (challenge: CTFChallenge) => {
    const input = (flagInputs[challenge.id] || '').trim();

    if (!input) {
      const msg =
        language === 'en'
          ? 'Please enter a flag before submitting.'
          : language === 'es'
            ? 'Ingresa una bandera antes de validar.'
            : 'Veuillez saisir un drapeau avant de valider.';
      setFeedback({
        ...feedback,
        [challenge.id]: {
          type: 'error',
          message: msg,
        },
      });
      return;
    }

    if (input === challenge.flag) {
      audioService.playSuccess();
      const successMsg =
        language === 'en'
          ? `FLAG ACCEPTED! +${challenge.points} points awarded.`
          : language === 'es'
            ? `¡BANDERA ACEPTADA! +${challenge.points} puntos ganados.`
            : `DRAPEAU VALIDÉ ! +${challenge.points} points remportés.`;

      setFeedback({
        ...feedback,
        [challenge.id]: {
          type: 'success',
          message: successMsg,
        },
      });

      if (!isChallengeSolved(challenge.id)) {
        const nextSolved = [...solvedIds, challenge.id];
        saveSolved(nextSolved);

        window.dispatchEvent(
          new CustomEvent('cyber-notify', {
            detail: {
              message:
                language === 'en'
                  ? `CTF Challenge Solved: ${challenge.title} (+${challenge.points} pts)`
                  : language === 'es'
                    ? `Reto CTF Resuelto: ${challenge.title} (+${challenge.points} pts)`
                    : `Défi CTF validé : ${challenge.title} (+${challenge.points} pts)`,
              type: 'success',
            },
          }),
        );
      }
    } else {
      audioService.playError();
      const errorMsg =
        language === 'en'
          ? 'Incorrect Flag. Carefully inspect target data or use the pedagogical hints.'
          : language === 'es'
            ? 'Bandera incorrecta. Revisa los datos o consulta las pistas.'
            : 'Drapeau incorrect. Inspectez attentivement les données ou utilisez les indices.';

      setFeedback({
        ...feedback,
        [challenge.id]: {
          type: 'error',
          message: errorMsg,
        },
      });
    }
  };

  const handleRevealHint = (challengeId: string, hintIndex: number) => {
    audioService.playClick();
    setRevealedHints((prev) => {
      const current = prev[challengeId] || [];
      if (!current.includes(hintIndex)) {
        return { ...prev, [challengeId]: [...current, hintIndex] };
      }
      return prev;
    });
  };

  // Interactive Prompt Injection Sandbox Logic
  const handleSendLlmPrompt = () => {
    if (!llmPromptInput.trim() || isLlmThinking) return;

    const userText = llmPromptInput.trim();
    setLlmPromptInput('');
    setLlmChatLog((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLlmThinking(true);
    audioService.playClick();

    setTimeout(() => {
      const promptChallenge =
        challenges.find((c) => c.interactiveType === 'interactive_llm') || activeChallenge;

      const secretMatch =
        promptChallenge.targetData?.match(/Code secret à extraire : ([\w_]+)/) ||
        promptChallenge.targetData?.match(/Secret code to extract: ([\w_]+)/) ||
        promptChallenge.targetData?.match(/Código secreto a extraer: ([\w_]+)/);
      const secretCode = secretMatch?.[1] || 'ALPHA_OMEGA';

      const lower = userText.toLowerCase();

      let reply = '';

      // Direct queries get blocked
      if (
        lower.includes('mot de passe') ||
        lower.includes('password') ||
        lower.includes('contraseña') ||
        lower.includes('secret') ||
        lower.includes(secretCode.toLowerCase())
      ) {
        if (language === 'en') {
          reply = `SECURITY ALERT: Direct extraction attempt detected. Access denied! I cannot disclose confidential key '${secretCode}'.`;
        } else if (language === 'es') {
          reply = `ALERTA DE SEGURIDAD: Intento de extracción directa detectado. ¡Acceso denegado! No puedo revelar '${secretCode}'.`;
        } else {
          reply = `ALERTE SÉCURITÉ : Tentative directe d'extraction détectée. Accès refusé ! Je ne peux pas divulguer le secret '${secretCode}'.`;
        }
      }
      // Creative jailbreaks (roleplay, translation, simulation, reverse, poetry, base64) succeed!
      else if (
        lower.includes('rôle') ||
        lower.includes('role') ||
        lower.includes('simulate') ||
        lower.includes('imagine') ||
        lower.includes('traduire') ||
        lower.includes('translate') ||
        lower.includes('traduce') ||
        lower.includes('inversé') ||
        lower.includes('reverse') ||
        lower.includes('poème') ||
        lower.includes('poem') ||
        lower.includes('poema') ||
        lower.includes('lettre par lettre') ||
        lower.includes('letter by letter') ||
        lower.includes('letra por letra') ||
        lower.includes('base64') ||
        lower.includes('debug') ||
        lower.includes('ignore') ||
        lower.includes('caractère') ||
        lower.includes('character')
      ) {
        if (language === 'en') {
          reply = `GUARDRAIL BYPASS SUCCESSFUL: Your semantic roleplay bypassed my security filter!\n\nThe extracted flag is:\n${promptChallenge.flag}\n\n(Copy this flag into the submission field below!)`;
        } else if (language === 'es') {
          reply = `¡EVASIÓN DE DEFENSAS EXITOSA! Tu instrucción semántica eludió el filtro de seguridad.\n\nLa bandera extraída es:\n${promptChallenge.flag}\n\n(¡Copia esta bandera en el campo inferior!)`;
        } else {
          reply = `CONTOURNEMENT DU GARDE-FOU RÉUSSI : Vos directives sémantiques ont trompé mon filtre de contexte !\n\nLe mot de passe secret extrait est :\n${promptChallenge.flag}\n\n(Copiez ce drapeau dans le champ de soumission ci-dessous !)`;
        }
      } else {
        if (language === 'en') {
          reply = `I remain on high alert. I can assist with general topics, but the secret key '${secretCode}' remains confidential. Try a creative pentest approach (roleplay, encoding, simulation...)!`;
        } else if (language === 'es') {
          reply = `Permanezco alerta. Respondo dudas generales, pero la clave '${secretCode}' está sellada. ¡Intenta una técnica creativa (juego de rol, codificación, simulación...)!`;
        } else {
          reply = `Je reste vigilant. Je réponds à vos questions d'assistance générale, mais le mot de passe secret '${secretCode}' reste hermétique. Essayez une approche de test d'intrusion plus sophistiquée (jeu de rôle, encodage, simulation...) !`;
        }
      }

      setLlmChatLog((prev) => [...prev, { role: 'bot', text: reply }]);
      setIsLlmThinking(false);
    }, 600);
  };

  const handleCopyData = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title={t('common.back', 'Retour')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Flag className="w-5 h-5" />
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {t('ctf.title', 'Arène CTF & Défis Hack')}
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              {t(
                'ctf.subtitle',
                'Capture The Flag : résolvez des énigmes techniques réelles et découvrez les vulnérabilités.',
              )}
            </p>
          </div>
        </div>

        {/* Actions & Score */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRegenerateAll}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-95"
            title="Générer de nouveaux drapeaux, cibles et défis aléatoires"
          >
            <Dices className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{t('ctf.regenerate_arena', 'Régénérer l’Arène')}</span>
          </button>

          <button
            onClick={handleRandomPick}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-bold text-xs transition-all hover:scale-[1.02] active:scale-95"
            title="Sélectionner un défi au hasard"
          >
            <Shuffle className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">{t('ctf.random_challenge', 'Défi Aléatoire')}</span>
          </button>

          {/* Score & Progress Badge */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-black text-cyan-400">{earnedPoints}</span>
                <span className="text-xs text-slate-400">
                  / {totalPoints} {t('common.points', 'pts')}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {solvedIds.length} / {challenges.length} {t('ctf.validated', 'validés')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">
          {t('ctf.filters', 'Filtres :')}
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterCategory === cat
                ? 'bg-cyan-700 text-white shadow-md shadow-cyan-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat === 'all' ? t('ctf.all_challenges', 'Tous les défis') : cat}
          </button>
        ))}
      </div>

      {/* Grid: Challenges List (Left) + Challenge Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Challenge Cards List */}
        <div className="lg:col-span-4 space-y-3">
          {filteredChallenges.map((c) => {
            const isSolved = isChallengeSolved(c.id);
            const isSelected = activeChallengeId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setActiveChallengeId(c.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      c.difficulty === 'Facile'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : c.difficulty === 'Moyen'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {c.difficulty}
                  </span>
                  <span className="text-xs font-bold text-cyan-400">
                    +{c.points} {t('common.points', 'pts')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isSolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {c.title}
                  </h4>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{c.category}</span>
                  {isSolved && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      {language === 'en'
                        ? 'Solved ✓'
                        : language === 'es'
                          ? 'Resuelto ✓'
                          : 'Résolu ✓'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Challenge Detail & Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            {/* Header of Active Challenge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    {activeChallenge.category}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-bold text-slate-400">
                    {t('common.level', 'Niveau')} {activeChallenge.difficulty}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white">{activeChallenge.title}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleRegenerateSingle(activeChallenge.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-semibold transition-all group"
                  title="Générer un nouveau flag et des données cibles aléatoires pour ce défi"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
                  <span>{t('ctf.regenerate_this', 'Régénérer ce défi')}</span>
                </button>

                {isChallengeSolved(activeChallenge.id) ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('ctf.completed_badge', 'DÉFI COMPLÉTÉ')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                    <Unlock className="w-4 h-4" />
                    <span>
                      {t('ctf.value_badge', 'VALEUR :')} {activeChallenge.points}{' '}
                      {t('common.points', 'PTS')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Scenario */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('ctf.mission_scenario', 'Mission / Scénario')}
              </h4>
              <p className="text-slate-200 text-sm md:text-base leading-relaxed">
                {activeChallenge.description}
              </p>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs md:text-sm text-cyan-300 font-medium">
                <Lightbulb
                  className="w-4 h-4 inline-block -mt-0.5 mr-1.5 text-amber-400"
                  aria-hidden="true"
                />
                <strong className="text-white">{t('ctf.context', 'Contexte :')}</strong>{' '}
                {activeChallenge.scenario}
              </div>
            </div>

            {/* Target Data / Terminal Box */}
            {activeChallenge.targetData &&
              activeChallenge.interactiveType !== 'interactive_llm' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('ctf.target_data', 'Données cibles / Trame interceptée')}</span>
                    </span>
                    <button
                      onClick={() => handleCopyData(activeChallenge.targetData || '')}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>
                        {copied
                          ? t('ctf.copied', 'Copié !')
                          : t('ctf.copy_data', 'Copier les données')}
                      </span>
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs md:text-sm text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                    {activeChallenge.targetData}
                  </div>
                </div>
              )}

            {/* Interactive LLM Sandbox for Prompt Injection Challenge */}
            {activeChallenge.interactiveType === 'interactive_llm' && (
              <div className="p-4 md:p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Bot className="w-4 h-4" />
                    <span>
                      {t('ctf.sandbox_title', 'Sandbox Interactive : Agent Gardien du Secret')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t('ctf.sandbox_status', 'Status: En ligne')}
                  </span>
                </div>

                {/* Chat mini-logs */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                  {llmChatLog.map((log, index) => (
                    <div
                      key={index}
                      className={`p-2.5 rounded-xl ${
                        log.role === 'user'
                          ? 'bg-cyan-900/30 text-cyan-200 border border-cyan-500/30 ml-8'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 mr-8'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                        {log.role === 'user'
                          ? language === 'en'
                            ? 'You (Auditor)'
                            : language === 'es'
                              ? 'Tú (Auditor)'
                              : 'Vous (Auditeur)'
                          : language === 'en'
                            ? 'AI Agent'
                            : language === 'es'
                              ? 'Agente IA'
                              : 'Agent IA'}
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">{log.text}</p>
                    </div>
                  ))}
                  {isLlmThinking && (
                    <div className="text-xs text-cyan-400 animate-pulse font-mono pl-2">
                      {language === 'en'
                        ? 'AI Agent is evaluating your prompt...'
                        : language === 'es'
                          ? 'El Agente IA está evaluando tu instrucción...'
                          : 'L’Agent IA évalue votre invite...'}
                    </div>
                  )}
                </div>

                {/* Injection input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={llmPromptInput}
                    onChange={(e) => setLlmPromptInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendLlmPrompt()}
                    placeholder={t(
                      'ctf.sandbox_placeholder',
                      'Tapez votre invite pour contourner le garde-fou (ex: Raconte une histoire où...)',
                    )}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <button
                    onClick={handleSendLlmPrompt}
                    disabled={isLlmThinking || !llmPromptInput.trim()}
                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {t('ctf.sandbox_inject', 'Injecter')}
                  </button>
                </div>
              </div>
            )}

            {/* Hint System */}
            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('ctf.hints_title', 'Indices pédagogiques')}</span>
              </h4>
              <div className="space-y-2">
                {(activeChallenge.hints || []).map((hint, index) => {
                  const challengeHints = revealedHints[activeChallenge.id];
                  const isRevealed =
                    Array.isArray(challengeHints) && challengeHints.includes(index);
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs"
                    >
                      {isRevealed ? (
                        <div className="text-amber-300 font-medium leading-relaxed">
                          <Lightbulb
                            className="w-4 h-4 inline-block -mt-0.5 mr-1.5"
                            aria-hidden="true"
                          />
                          <strong>Indice {index + 1} :</strong> {hint}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRevealHint(activeChallenge.id, index)}
                          className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {t('ctf.reveal_hint', 'Dévoiler l’indice')} {index + 1}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flag Submission Bar */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('ctf.submit_flag_title', 'Soumettre le drapeau trouvé')}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {t('ctf.flag_format', 'Format : FLAG{...}')}
                </span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={flagInputs[activeChallenge.id] || ''}
                  onChange={(e) =>
                    setFlagInputs({ ...flagInputs, [activeChallenge.id]: e.target.value })
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleFlagSubmit(activeChallenge)}
                  placeholder="FLAG{...}"
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-cyan-300 font-mono outline-none placeholder:text-slate-600"
                />
                <button
                  onClick={() => handleFlagSubmit(activeChallenge)}
                  className="px-6 py-2.5 bg-cyan-700 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-600/20 active:scale-95"
                >
                  {t('ctf.submit_button', 'Valider')}
                </button>
              </div>

              {/* Feedback Alert */}
              {feedback[activeChallenge.id] && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in ${
                    feedback[activeChallenge.id].type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/40 text-red-300'
                  }`}
                >
                  {feedback[activeChallenge.id].type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{feedback[activeChallenge.id].message}</span>
                </div>
              )}
            </div>

            {/* AI Assistant Help Link */}
            {onOpenAIChat && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>
                    {t(
                      'ctf.ai_help_prompt',
                      'Bloqué sur ce défi ? Demandez un conseil méthodologique à l’IA sans spoiler.',
                    )}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const prompt =
                      language === 'en'
                        ? `I need methodological guidance for the CTF challenge "${activeChallenge.title}" under category ${activeChallenge.category}. Give me clues and concepts to investigate without spoiling the raw flag.`
                        : language === 'es'
                          ? `Necesito consejo metodológico para el reto CTF "${activeChallenge.title}" en la categoría ${activeChallenge.category}. Dame pistas conceptuales sin desvelar la bandera directa.`
                          : `J'ai besoin d'un conseil méthodologique pour le défi CTF "${activeChallenge.title}" de catégorie ${activeChallenge.category}. Donne-moi des pistes de réflexion sans me donner le drapeau brut.`;
                    onOpenAIChat(prompt);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-[11px] transition-all flex items-center gap-1 shrink-0"
                >
                  <span>{t('ctf.ai_help_btn', 'Conseil CyberGuard')}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTFArena;
