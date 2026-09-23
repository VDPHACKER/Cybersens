import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Question, PlayerScore } from '../../types';
import { generateQuizQuestions } from '../../services/geminiService';
import { audioService } from '../../services/audioService';
import { useI18n } from '../../services/i18n';

interface MultiQuizProps {
  onExit: () => void;
}

const MultiQuiz: React.FC<MultiQuizProps> = ({ onExit }) => {
  const { t, language } = useI18n();
  const [phase, setPhase] = useState<'selection' | 'lobby' | 'generating' | 'playing' | 'results'>(
    'selection',
  );
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Moyen');

  const myName = language === 'en' ? 'You' : language === 'es' ? 'Tú' : 'Vous';

  const [players, setPlayers] = useState<PlayerScore[]>([
    { name: myName, score: 0, totalTime: 0, isMe: true },
    { name: 'Cyber_Hunter', score: 0, totalTime: 0, isMe: false },
    { name: 'NetGuardian', score: 0, totalTime: 0, isMe: false },
    { name: 'Root_Access', score: 0, totalTime: 0, isMe: false },
  ]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  const initialTimeLimit = useMemo(() => {
    if (difficulty === 'Facile' || difficulty === 'Easy' || difficulty === 'Fácil') return 60;
    if (difficulty === 'Difficile' || difficulty === 'Hard' || difficulty === 'Difícil') return 15;
    return 30;
  }, [difficulty]);

  const [timer, setTimer] = useState(initialTimeLimit);
  const [answered, setAnswered] = useState(false);
  const [lastGains, setLastGains] = useState<Record<string, number>>({});
  const [hasAnsweredThisTurn, setHasAnsweredThisTurn] = useState<Set<string>>(new Set());

  const npcTimersRef = useRef<number[]>([]);

  useEffect(() => {
    if (phase === 'lobby' && role === 'guest') {
      const syncTimeout = setTimeout(() => {
        startGame();
      }, 5000);
      return () => clearTimeout(syncTimeout);
    }
  }, [phase, role]);

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setRole('host');
    setPhase('lobby');
  };

  const handleJoinRoom = () => {
    if (inputCode.length < 4) {
      alert(
        language === 'en'
          ? 'Invalid room code.'
          : language === 'es'
            ? 'Código de sala no válido.'
            : 'Code de salle invalide.',
      );
      return;
    }
    setRoomCode(inputCode.toUpperCase());
    setRole('guest');
    setPhase('lobby');
    setTimeout(() => {
      setPlayers((prev) => [...prev, { name: 'Admin_Host', score: 0, totalTime: 0, isMe: false }]);
    }, 1000);
  };

  useEffect(() => {
    let interval: any;
    if (phase === 'playing' && questions.length > 0) {
      interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            handleTimeout();
            return initialTimeLimit;
          }
          return t - 1;
        });
      }, 1000);

      players.forEach((p) => {
        if (!p.isMe) {
          const delay = Math.random() * (initialTimeLimit * 400) + 800;
          const timeout = window.setTimeout(() => {
            simulateNpcAnswer(p.name);
          }, delay);
          npcTimersRef.current.push(timeout);
        }
      });
    }
    return () => {
      clearInterval(interval);
      npcTimersRef.current.forEach((t) => clearTimeout(t));
      npcTimersRef.current = [];
    };
  }, [phase, currentQIndex, questions, initialTimeLimit]);

  const simulateNpcAnswer = (playerName: string) => {
    setHasAnsweredThisTurn((prev) => {
      if (prev.has(playerName)) return prev;
      const next = new Set(prev);
      next.add(playerName);
      const isCorrect = Math.random() > (difficulty === 'Difficile' ? 0.6 : 0.3);
      const points = isCorrect ? 1000 + Math.floor(Math.random() * 500) : 0;
      if (points > 0) {
        setLastGains((prevGains) => ({ ...prevGains, [playerName]: points }));
        setPlayers((prevPlayers) =>
          prevPlayers.map((p) => (p.name === playerName ? { ...p, score: p.score + points } : p)),
        );
        setTimeout(() => setLastGains((prev) => ({ ...prev, [playerName]: 0 })), 1500);
      }
      return next;
    });
  };

  const handleTimeout = () => {
    nextQuestion();
  };

  const startGame = async () => {
    setPhase('generating');
    try {
      const generated = await generateQuizQuestions(questionCount, difficulty, language);
      setQuestions(generated);
      setTimer(initialTimeLimit);
      setPhase('playing');
    } catch (error) {
      alert(
        language === 'en'
          ? 'Tactical connection error.'
          : language === 'es'
            ? 'Error de conexión táctica.'
            : 'Erreur de connexion tactique.',
      );
      setPhase('lobby');
    }
  };

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setAnswered(true);
    const correct = idx === questions[currentQIndex].correctAnswer;

    const timeRatio = timer / initialTimeLimit;
    const timeBonus = Math.round(timeRatio * 500);
    const points = correct ? 1000 + timeBonus : 0;

    if (correct) audioService.playSuccess();
    else audioService.playError();
    if (points > 0) {
      setLastGains((prev) => ({ ...prev, [myName]: points }));
      setPlayers((prev) => prev.map((p) => (p.isMe ? { ...p, score: p.score + points } : p)));
      setTimeout(() => setLastGains((prev) => ({ ...prev, [myName]: 0 })), 1500);
    }
    setHasAnsweredThisTurn((prev) => {
      const next = new Set(prev);
      next.add(myName);
      return next;
    });
    setTimeout(nextQuestion, 2500);
  };

  const nextQuestion = () => {
    npcTimersRef.current.forEach((t) => clearTimeout(t));
    npcTimersRef.current = [];
    setHasAnsweredThisTurn(new Set());
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setTimer(initialTimeLimit);
      setAnswered(false);
    } else {
      setPhase('results');
    }
  };

  const difficultyLabels = [
    { key: 'Facile', label: language === 'en' ? 'EASY' : language === 'es' ? 'FÁCIL' : 'FACILE' },
    { key: 'Moyen', label: language === 'en' ? 'MEDIUM' : language === 'es' ? 'MEDIO' : 'MOYEN' },
    {
      key: 'Difficile',
      label: language === 'en' ? 'HARD' : language === 'es' ? 'DIFÍCIL' : 'DIFFICILE',
    },
  ];

  if (phase === 'selection')
    return (
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 animate-in slide-in-from-bottom-8 duration-700 px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter">
            {language === 'en'
              ? 'Multiplayer Speed Battle'
              : language === 'es'
                ? 'Modo Multijugador'
                : 'Mode Multijoueurs'}
          </h2>
          <p className="text-slate-500 font-medium text-sm md:text-base">
            {language === 'en'
              ? 'Challenge other analysts in real time.'
              : language === 'es'
                ? 'Desafía a otros agentes en tiempo real.'
                : "Défiez d'autres joueurs en temps réel."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-slate-900 border-2 border-slate-800 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] hover:border-blue-500/50 transition-all shadow-2xl flex flex-col">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-xl">
              📡
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-2 md:mb-4 uppercase italic">
              {language === 'en'
                ? 'Create a Room'
                : language === 'es'
                  ? 'Crear Sala'
                  : 'Créer une Salle'}
            </h3>
            <p className="text-slate-500 mb-6 text-sm md:text-base flex-1">
              {language === 'en'
                ? 'Become the host and configure question parameters for the lobby.'
                : language === 'es'
                  ? 'Sé el anfitrión y configura la sesión para competir con otros.'
                  : "Devenez l'Hôte et configurez la session pour relever le défi avec les autres"}
            </p>
            <button
              onClick={handleCreateRoom}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg md:text-xl transition-all active:scale-95 italic uppercase"
            >
              {language === 'en' ? 'CREATE' : language === 'es' ? 'CREAR' : 'CRÉER'}
            </button>
          </div>

          <div className="bg-slate-900 border-2 border-slate-800 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] hover:border-emerald-500/50 transition-all shadow-2xl flex flex-col">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 shadow-xl">
              🔑
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-2 md:mb-4 uppercase italic">
              {language === 'en' ? 'Join a Room' : language === 'es' ? 'Unirse' : 'Rejoindre'}
            </h3>
            <input
              type="text"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder={
                language === 'en'
                  ? 'CODE (E.G. 8XF2A)'
                  : language === 'es'
                    ? 'CÓDIGO (EJ. 8XF2A)'
                    : 'CODE (EX: 8XF2A)'
              }
              className="w-full bg-slate-950 border-2 border-slate-800 p-3 md:p-4 rounded-xl text-emerald-500 font-mono text-center text-xl md:text-2xl outline-none focus:border-emerald-500 transition-colors mb-4 md:mb-6"
            />
            <button
              onClick={handleJoinRoom}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg md:text-xl transition-all active:scale-95 italic uppercase"
            >
              {language === 'en' ? 'CONNECT' : language === 'es' ? 'CONECTAR' : 'CONNECTER'}
            </button>
          </div>
        </div>
        <button
          onClick={onExit}
          className="block mx-auto text-slate-600 hover:text-white font-black text-[10px] uppercase tracking-widest"
        >
          {t('common.back', 'Retour')}
        </button>
      </div>
    );

  if (phase === 'generating')
    return (
      <div className="flex flex-col items-center justify-center py-24 md:py-40 space-y-8 bg-slate-950 rounded-[3rem]">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-500 font-black uppercase text-sm md:text-lg tracking-widest animate-pulse italic">
          {language === 'en'
            ? 'Generating tactical scenario...'
            : language === 'es'
              ? 'Generando escenario táctico...'
              : 'Génération du scénario...'}
        </p>
      </div>
    );

  if (phase === 'lobby')
    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 animate-in fade-in duration-500 px-4">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl">
          <h2 className="text-xl md:text-2xl font-black mb-6 text-white flex items-center gap-3 uppercase italic">
            <span className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xs md:text-sm">
              📡
            </span>
            {language === 'en' ? 'Room' : language === 'es' ? 'Sala' : 'Salle'} : {roomCode}
          </h2>

          {role === 'host' ? (
            <div className="space-y-6 md:space-y-8">
              <div className="bg-slate-950/50 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <div className="flex justify-between mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>QUESTIONS</span>
                    <span className="text-blue-500 font-mono text-lg">{questionCount}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest">
                    {language === 'en'
                      ? 'DIFFICULTY'
                      : language === 'es'
                        ? 'DIFICULTAD'
                        : 'DIFFICULTÉ'}
                  </label>
                  <div className="flex gap-2">
                    {difficultyLabels.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => setDifficulty(d.key)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black border-2 transition-all ${difficulty === d.key ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-800 text-slate-600'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={startGame}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-2xl transition-all active:scale-95 italic uppercase"
              >
                {language === 'en'
                  ? 'LAUNCH MISSION'
                  : language === 'es'
                    ? 'INICIAR MISIÓN'
                    : 'LANCER'}
              </button>
            </div>
          ) : (
            <div className="text-center py-10 space-y-6 bg-slate-950/50 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
              </div>
              <div>
                <h4 className="text-lg font-black text-white uppercase italic">
                  {language === 'en'
                    ? 'Waiting for Host'
                    : language === 'es'
                      ? 'Esperando al Anfitrión'
                      : "Attente de l'Hôte"}
                </h4>
                <p className="text-slate-500 text-xs mt-2 px-4">
                  {language === 'en'
                    ? 'Deployment will begin as soon as the Host starts the lobby (auto-sync enabled).'
                    : language === 'es'
                      ? 'El despliegue comenzará en cuanto el anfitrión inicie (sincronización auto).'
                      : "Le déploiement commencera dès que l'Admin lancera la mission (sync auto activée)."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 flex-1 shadow-2xl overflow-hidden">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 border-l-4 border-blue-500 pl-3">
              {language === 'en'
                ? 'CONNECTED AGENTS'
                : language === 'es'
                  ? 'AGENTES CONECTADOS'
                  : 'AGENTS CONNECTÉS'}
            </h4>
            <div className="space-y-3">
              {players.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 animate-in fade-in"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{p.isMe ? '⭐' : '🕵️'}</span>
                    <span
                      className={`text-sm font-bold ${p.isMe ? 'text-blue-400' : 'text-slate-300'}`}
                    >
                      {p.name}
                    </span>
                  </div>
                  {p.name === 'Admin_Host' && (
                    <span className="text-[8px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-black border border-blue-500/20">
                      {language === 'en' ? 'HOST' : language === 'es' ? 'ANFITRIÓN' : 'HÔTE'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

  if (phase === 'results')
    return (
      <div className="max-w-2xl mx-auto bg-slate-950 border-2 md:border-4 border-blue-600 rounded-[3rem] p-8 md:p-12 text-center shadow-2xl animate-in zoom-in-90 px-4">
        <h2 className="text-2xl md:text-3xl font-black mb-8 text-white uppercase italic tracking-tighter">
          {language === 'en'
            ? 'Final Leaderboard'
            : language === 'es'
              ? 'Clasificación Final'
              : 'Leaderboard Final'}
        </h2>
        <div className="space-y-3 mb-10">
          {sortedPlayers.map((p, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 ${p.isMe ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-xl font-black opacity-30">#{i + 1}</span>
                <span className="text-sm md:text-base font-bold">{p.name}</span>
              </div>
              <span className="text-lg md:text-2xl font-black mono">{p.score}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onExit}
          className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-lg active:scale-95 shadow-2xl uppercase italic"
        >
          {language === 'en' ? 'Finish' : language === 'es' ? 'Terminar' : 'Terminer'}
        </button>
      </div>
    );

  const q = questions[currentQIndex];
  if (!q) return null;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500 px-4">
      {/* Real-time Leaderboard Side/Bottom */}
      <div className="order-2 lg:order-1 lg:col-span-1">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 lg:sticky lg:top-28 shadow-2xl">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6 text-center">
            Scoreboard
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {sortedPlayers.map((p) => (
              <div
                key={p.name}
                className={`relative flex items-center justify-between p-3 rounded-xl border ${p.isMe ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-950 border-slate-800'}`}
              >
                {lastGains[p.name] > 0 && (
                  <div className="absolute -right-1 -top-2 bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-lg animate-bounce">
                    +{lastGains[p.name]}
                  </div>
                )}
                <div className="min-w-0">
                  <span
                    className={`text-[9px] font-black uppercase block truncate ${p.isMe ? 'text-blue-400' : 'text-slate-500'}`}
                  >
                    {p.name}
                  </span>
                  <span className="text-xl font-mono font-black text-white">{p.score}</span>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${hasAnsweredThisTurn.has(p.name) ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-800'}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="order-1 lg:order-2 lg:col-span-3 space-y-6">
        <div className="flex justify-between items-center bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-slate-800 shadow-xl">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${timer <= 5 ? 'text-red-500 border-red-500 animate-pulse bg-red-500/10' : 'text-blue-500 border-blue-500 bg-slate-950'}`}
            >
              <span className="text-xl md:text-2xl font-black font-mono leading-none">{timer}</span>
            </div>
            <div className="hidden xs:block">
              <span className="text-[9px] text-slate-500 font-black uppercase block tracking-widest">
                {language === 'en' ? 'Channel' : language === 'es' ? 'Canal' : 'Canal'}
              </span>
              <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full uppercase">
                {language === 'en' ? 'LIVE' : language === 'es' ? 'EN VIVO' : 'Diffusé'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">
              {language === 'en' ? 'Sequence' : language === 'es' ? 'Secuencia' : 'Séquence'}
            </span>
            <div className="text-xl md:text-2xl font-black text-white mono">
              {currentQIndex + 1}/{questions.length}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timer / initialTimeLimit) * 100}%` }}
          ></div>

          <h2 className="text-lg md:text-2xl font-black mb-8 leading-tight text-white italic">
            <span className="text-blue-500 mr-2 md:mr-3">»</span>
            {q.text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                disabled={answered}
                onClick={() => handleAnswer(idx)}
                className={`p-4 md:p-6 rounded-2xl border-2 text-left transition-all font-black text-sm md:text-base flex items-center ${
                  answered
                    ? idx === q.correctAnswer
                      ? 'bg-emerald-600 border-emerald-300 text-white scale-[1.02] shadow-lg'
                      : 'opacity-20 border-transparent'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500 active:scale-[0.98]'
                }`}
              >
                <span
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-slate-900 text-blue-500 text-center leading-8 md:leading-10 mr-3 md:mr-4 font-mono text-sm`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            ))}
          </div>

          {answered && (
            <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-blue-500/20 animate-in slide-in-from-bottom-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
                🛡️{' '}
                {language === 'en'
                  ? 'Defense_Report.log'
                  : language === 'es'
                    ? 'Informe_Defensa.log'
                    : 'Rapport_Défense'}
              </p>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed italic">
                &ldquo;{q.explanation}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiQuiz;
