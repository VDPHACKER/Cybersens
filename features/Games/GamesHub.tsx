import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../../services/audioService';
import AiThreatsGame from './AiThreatsGame';
import { useI18n } from '../../services/i18n';

type GameID = 'ai_threats' | 'whack' | 'bruteforce' | 'sqli' | 'ddos';

interface GamesHubProps {
  onBack: () => void;
}

const GamesHub: React.FC<GamesHubProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const [activeGame, setActiveGame] = useState<null | GameID>(null);

  if (activeGame === 'ai_threats') return <AiThreatsGame onExit={() => setActiveGame(null)} />;
  if (activeGame === 'whack') return <WhackAHacker onExit={() => setActiveGame(null)} />;
  if (activeGame === 'bruteforce') return <BruteForceGame onExit={() => setActiveGame(null)} />;
  if (activeGame === 'sqli') return <SqlInjectionGame onExit={() => setActiveGame(null)} />;
  if (activeGame === 'ddos') return <DdosDefenseGame onExit={() => setActiveGame(null)} />;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-cyan-500 transition-colors font-black text-[10px] uppercase tracking-[0.3em] w-fit px-2"
      >
        <span className="text-xl">←</span> {t('common.back_to_hub', 'Retour au Hub')}
      </button>

      <div className="text-center">
        <h2 className="text-4xl md:text-5xl font-black mb-2 text-white italic uppercase tracking-tighter">
          {t('games.title', 'Cyber Academy Jeux 🕹️')}
        </h2>
        <p className="text-slate-400 font-medium text-base md:text-lg">
          {t(
            'games.subtitle',
            'Apprenez les réflexes de défense face aux menaces classiques et aux cyberattaques assistées par IA.',
          )}
        </p>
      </div>

      {/* Featured AI Threats Game Banner */}
      <div
        onClick={() => setActiveGame('ai_threats')}
        className="relative bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/50 border-2 border-cyan-500/40 hover:border-cyan-400 p-6 md:p-8 rounded-3xl overflow-hidden cursor-pointer shadow-2xl group transition-all transform hover:-translate-y-0.5"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all text-8xl md:text-9xl">
          🧠
        </div>
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500 text-slate-950 uppercase tracking-widest">
              ★{' '}
              {language === 'en'
                ? 'NEW AI CHALLENGE'
                : language === 'es'
                  ? 'NUEVO RETO IA'
                  : 'NOUVEAU DÉFI IA'}
            </span>
            <span className="text-xs font-bold text-cyan-400">
              Prompt Injection • Deepfake • Agent Hijack
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic">
            {language === 'en'
              ? 'Hunting New AI Threats'
              : language === 'es'
                ? 'Caza de Nuevas Amenazas IA'
                : 'Chasse aux Nouvelles Menaces IA'}
          </h3>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            {language === 'en'
              ? 'Play as a security analyst defending against the modern wave of attacks: direct/indirect prompt injection, CEO voice deepfakes, data poisoning, and autonomous agent tool hijacking.'
              : language === 'es'
                ? 'Ponte en la piel de un analista de seguridad contra la nueva ola de ataques: inyección de prompts, deepfakes de voz de directores, envenenamiento de datos y secuestro de agentes autónomos.'
                : "Incarnez un analyste de sécurité face à la nouvelle vague d'attaques : prompt injections directes/indirectes, clonage vocal de PDG, empoisonnement de données et détournement d'agents autonomes."}
          </p>
          <div className="pt-2">
            <button className="px-6 py-3 bg-cyan-600 group-hover:bg-cyan-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/30">
              {language === 'en'
                ? 'Launch AI Defense Mission →'
                : language === 'es'
                  ? 'Iniciar Misión de Defensa IA →'
                  : 'Lancer la Mission de Défense IA →'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GameCard
          id="ddos"
          title="DDoS Defense"
          icon="⚡"
          desc={
            language === 'en'
              ? 'Keep the server online under an influx of illegitimate traffic.'
              : language === 'es'
                ? 'Mantén el servidor en línea bajo una avalancha de tráfico malicioso.'
                : 'Maintenez le serveur en ligne sous une pluie de requêtes illégitimes.'
          }
          color="bg-red-600"
          btnText={language === 'en' ? 'DEPLOY' : language === 'es' ? 'DESPLEGAR' : 'DÉPLOYER'}
          onClick={() => setActiveGame('ddos')}
        />
        <GameCard
          id="bruteforce"
          title={
            language === 'en'
              ? 'Brute Force Lab'
              : language === 'es'
                ? 'Laboratorio Fuerza Bruta'
                : 'Lab Brute Force'
          }
          icon="🔐"
          desc={
            language === 'en'
              ? 'Optimize a script to guess the password before lockout.'
              : language === 'es'
                ? 'Optimiza un script para descifrar contraseñas antes del bloqueo.'
                : 'Optimisez un script pour deviner un mot de passe avant le verrouillage.'
          }
          color="bg-blue-600"
          btnText={language === 'en' ? 'DEPLOY' : language === 'es' ? 'DESPLEGAR' : 'DÉPLOYER'}
          onClick={() => setActiveGame('bruteforce')}
        />
        <GameCard
          id="sqli"
          title={
            language === 'en'
              ? 'SQL Injection Lab'
              : language === 'es'
                ? 'Laboratorio Inyección SQL'
                : 'Lab Injection SQL'
          }
          icon="💉"
          desc={
            language === 'en'
              ? 'Inject sanitized payloads to breach and inspect a database.'
              : language === 'es'
                ? 'Inyecta comandos para vulnerar una base de datos protegida.'
                : "Injectez des commandes pour forcer l'accès à une base de données protégée."
          }
          color="bg-emerald-600"
          btnText={language === 'en' ? 'DEPLOY' : language === 'es' ? 'DESPLEGAR' : 'DÉPLOYER'}
          onClick={() => setActiveGame('sqli')}
        />
        <GameCard
          id="whack"
          title={
            language === 'en'
              ? 'Hacker Defense Attack'
              : language === 'es'
                ? 'Ataque Hacker Reflejos'
                : 'Attaque Hacker'
          }
          icon="👺"
          desc={
            language === 'en'
              ? 'Pure reflexes! Neutralize incoming threats before they breach the firewall.'
              : language === 'es'
                ? '¡Puros reflejos! Elimina amenazas antes de que penetren el firewall.'
                : "Réflexes purs ! Éliminez les menaces avant qu'elles n'atteignent le pare-feu."
          }
          color="bg-orange-600"
          btnText={language === 'en' ? 'DEPLOY' : language === 'es' ? 'DESPLEGAR' : 'DÉPLOYER'}
          onClick={() => setActiveGame('whack')}
        />
      </div>
    </div>
  );
};

const GameCard = ({ title, icon, desc, color, btnText = 'DÉPLOYER', onClick }: any) => (
  <div
    onClick={onClick}
    className="group relative bg-slate-900 border-2 border-slate-800 p-8 rounded-[3rem] overflow-hidden hover:border-cyan-500/50 transition-all cursor-pointer shadow-xl"
  >
    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-all text-8xl">
      {icon}
    </div>
    <h3 className="text-3xl font-black mb-4 text-white uppercase italic">{title}</h3>
    <p className="text-slate-500 mb-8 text-base leading-relaxed">{desc}</p>
    <button
      className={`px-10 py-4 ${color} hover:opacity-90 rounded-2xl font-black transition-all shadow-lg text-white uppercase italic tracking-tighter text-lg`}
    >
      {btnText}
    </button>
  </div>
);

const BruteForceGame = ({ onExit }: any) => {
  const [target, setTarget] = useState('CYBER');
  const [currentGuess, setCurrentGuess] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const [lastCharStatus, setLastCharStatus] = useState<'correct' | 'error' | 'none'>('none');

  const WORD_LIST = [
    ['ROOT', 'DATA', 'USER', 'PASS', 'HACK', 'AUTH', 'FIRE', 'PORT'],
    ['SYSTEM', 'KERNEL', 'SERVER', 'PACKET', 'CYBER', 'HIDDEN', 'SHIELD', 'BINARY'],
    ['TERMINAL', 'DATABASE', 'PROTOCOL', 'SECURITY', 'ENCRYPT', 'PHISHING', 'FIREWALL'],
  ];

  const generateNewTarget = useCallback(() => {
    const listIndex = Math.min(difficulty - 1, WORD_LIST.length - 1);
    const list = WORD_LIST[listIndex];
    setTarget(list[Math.floor(Math.random() * list.length)]);
  }, [difficulty]);

  const handleCharInput = useCallback(
    (char: string) => {
      if (!isPlaying) return;

      const normalizedChar = char.toUpperCase();
      if (!/^[A-Z]$/.test(normalizedChar)) return;

      const nextCharNeeded = target[currentGuess.length];

      if (normalizedChar === nextCharNeeded) {
        const newGuess = currentGuess + normalizedChar;
        setCurrentGuess(newGuess);
        setLastCharStatus('correct');
        audioService.playSuccess();

        if (newGuess === target) {
          setScore((s) => s + target.length * 50);
          setDifficulty((d) => (score > d * 500 ? d + 1 : d));
          setCurrentGuess('');
          generateNewTarget();
        }
      } else {
        setLastCharStatus('error');
        setCurrentGuess('');
        audioService.playError();
        // Secousse visuelle gérée par CSS
      }

      setTimeout(() => setLastCharStatus('none'), 150);
    },
    [isPlaying, currentGuess, target, generateNewTarget, score],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      handleCharInput(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCharInput, onExit]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-500 px-4">
      {/* HUD Header */}
      <div className="flex justify-between items-center bg-slate-900/80 backdrop-blur-xl border-2 border-slate-800 p-6 rounded-[2.5rem] shadow-2xl">
        {/* Fixed: changed onBack || onExit to just onExit as onBack is not defined in this scope */}
        <button
          onClick={onExit}
          className="text-slate-500 font-black hover:text-white uppercase tracking-widest text-[10px] bg-slate-950 px-4 py-2 rounded-xl border border-white/5 transition-all"
        >
          ← ABANDONNER
        </button>
        <div className="flex gap-8 items-center">
          <div className="text-right">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
              XP COLLECTÉ
            </span>
            <span className="font-mono text-2xl text-blue-400 font-black">{score}</span>
          </div>
          <div
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${timeLeft <= 5 ? 'border-red-500 text-red-500 bg-red-500/10 animate-pulse' : 'border-blue-500 text-blue-500 bg-slate-950'}`}
          >
            <span className="font-mono text-xl font-black">{timeLeft}</span>
            <span className="text-[7px] font-black uppercase">Sec</span>
          </div>
        </div>
      </div>

      {!isPlaying ? (
        <div className="bg-slate-900 border-2 border-slate-800 p-10 md:p-16 rounded-[4rem] text-center shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
          <div className="relative z-10">
            <div className="text-6xl mb-6">🔐</div>
            <h3 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
              Brute Force Lab
            </h3>
            <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
              Décryptez les séquences avant que le pare-feu ne verrouille l'accès permanent.
              Utilisez votre clavier pour plus de vitesse.
            </p>

            {score > 0 && (
              <div className="bg-blue-600/10 border border-blue-500/20 py-4 px-8 rounded-2xl inline-block mt-8">
                <span className="text-blue-400 font-black text-sm uppercase tracking-widest">
                  DERNIER SCORE: {score} XP
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setIsPlaying(true);
                setTimeLeft(30);
                setScore(0);
                setCurrentGuess('');
                setDifficulty(1);
                generateNewTarget();
              }}
              className="w-full max-w-xs mt-10 py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-xl shadow-xl shadow-blue-600/30 transform active:scale-95 transition-all uppercase italic italic tracking-tighter"
            >
              Initialiser l'Exploit
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Terminal Display */}
          <div
            className={`bg-slate-950 p-10 md:p-16 rounded-[3.5rem] border-4 transition-all duration-150 relative overflow-hidden shadow-inner ${
              lastCharStatus === 'error'
                ? 'border-red-600 scale-[0.98]'
                : lastCharStatus === 'correct'
                  ? 'border-blue-400'
                  : 'border-slate-900'
            }`}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-700 uppercase tracking-[0.5em]">
              Decryption_Interface_v4
            </div>

            <div className="flex justify-center gap-2 md:gap-4 mt-4">
              {target.split('').map((char, i) => {
                const isFound = i < currentGuess.length;
                return (
                  <div
                    key={i}
                    className={`w-12 h-16 md:w-16 md:h-24 rounded-2xl md:rounded-3xl border-2 flex items-center justify-center text-3xl md:text-5xl font-black font-mono transition-all duration-300 ${
                      isFound
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                        : 'bg-slate-900/50 border-slate-800 text-slate-800'
                    }`}
                  >
                    {isFound ? char : isPlaying ? '?' : ''}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col items-center gap-2">
              <div className="flex gap-1">
                {[...Array(target.length)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${i < currentGuess.length ? 'w-6 bg-blue-500' : 'w-2 bg-slate-800'}`}
                  ></div>
                ))}
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 animate-pulse">
                Saisie Clavier Requise
              </span>
            </div>
          </div>

          {/* Virtual Keyboard (for mobile/tablet) */}
          <div className="bg-slate-900/50 p-6 rounded-[3rem] border-2 border-slate-800 grid grid-cols-7 md:grid-cols-9 gap-2">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => (
              <button
                key={c}
                onMouseDown={() => handleCharInput(c)}
                className="aspect-square bg-slate-900 hover:bg-slate-800 rounded-xl font-black text-sm md:text-lg text-slate-400 active:bg-blue-600 active:text-white transition-all transform active:scale-90 border border-white/5 shadow-lg"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center opacity-30">
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
          Hardware-Accelerated Decryptor Core
        </span>
      </div>
    </div>
  );
};

const DdosDefenseGame = ({ onExit }: any) => {
  const [health, setHealth] = useState(100);
  const [traffic, setTraffic] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [isWafActive, setIsWafActive] = useState(false);
  const [isRateLimitActive, setIsRateLimitActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTraffic((t) => Math.min(1000, t + 10 + Math.random() * 20));
        let damage = traffic / 50;
        if (isWafActive) damage *= 0.1;
        if (isRateLimitActive) damage *= 0.3;
        setHealth((h) => {
          const newH = Math.max(0, h - damage);
          if (newH <= 0) setIsPlaying(false);
          return newH;
        });
        setScore((s) => s + 10);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, traffic, isWafActive, isRateLimitActive]);

  return (
    <div className="max-w-2xl mx-auto bg-slate-950 p-10 rounded-[4rem] border-4 border-slate-900 text-center animate-in zoom-in-95 shadow-2xl">
      <div className="flex justify-between items-center mb-10">
        <button
          onClick={onExit}
          className="text-slate-500 font-black hover:text-white uppercase tracking-widest text-[10px]"
        >
          ← QUITTER LE JEU
        </button>
        <div className="text-3xl font-black text-cyan-400 font-mono">XP: {score}</div>
      </div>

      {!isPlaying ? (
        <div className="py-12 space-y-8">
          <h3 className="text-5xl font-black text-white italic uppercase">DDOS DEFENSE</h3>
          <p className="text-slate-500 text-lg">
            Neutralisez l'assaut massif sur le serveur principal.
          </p>
          <button
            onClick={() => {
              setIsPlaying(true);
              setHealth(100);
              setTraffic(0);
              setScore(0);
            }}
            className="px-16 py-6 bg-red-600 hover:bg-red-500 rounded-3xl font-black text-white text-2xl shadow-xl active:scale-95 italic"
          >
            LANCER LA SIMULATION
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="bg-slate-900 p-8 rounded-3xl border-2 border-slate-800">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                SANTÉ DU SYSTÈME
              </span>
              <span
                className={`font-black text-2xl ${health > 30 ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {Math.round(health)}%
              </span>
            </div>
            <div className="h-8 bg-slate-950 rounded-full overflow-hidden p-1 border border-slate-800">
              <div
                className={`h-full transition-all duration-300 rounded-full ${health > 30 ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'}`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border-2 border-slate-800">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                TRAFIC ENTRANT
              </span>
              <span
                className={`font-black text-2xl ${traffic > 600 ? 'text-red-500 animate-pulse' : 'text-cyan-500'}`}
              >
                {Math.round(traffic)} req/s
              </span>
            </div>
            <div className="h-3 bg-slate-950 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${traffic > 600 ? 'bg-red-500' : 'bg-cyan-500'}`}
                style={{ width: `${(traffic / 1000) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setIsWafActive(!isWafActive)}
              className={`p-6 rounded-3xl font-black transition-all border-4 text-xl italic ${isWafActive ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-800 text-slate-600 hover:border-emerald-500'}`}
            >
              WAF {isWafActive ? 'ACTIF ✅' : 'OFF'}
            </button>
            <button
              onClick={() => setIsRateLimitActive(!isRateLimitActive)}
              className={`p-6 rounded-3xl font-black transition-all border-4 text-xl italic ${isRateLimitActive ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-800 text-slate-600 hover:border-blue-500'}`}
            >
              RATE LIMIT {isRateLimitActive ? 'ACTIF ✅' : 'OFF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SqlInjectionGame = ({ onExit }: any) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

  const testInjection = () => {
    const safeInput = input || '';
    if (
      safeInput.includes("' OR '1'='1") ||
      safeInput.includes("'--") ||
      safeInput.includes("' #")
    ) {
      setStatus('success');
    } else {
      setStatus('fail');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-950 p-12 rounded-[4rem] border-4 border-emerald-900/50 font-mono animate-in zoom-in-95 shadow-2xl">
      <div className="flex justify-between items-center mb-10">
        <span className="text-emerald-500 font-bold text-sm tracking-widest uppercase italic">
          terminal@cyberai:~$ exploit-sqli
        </span>
        <button onClick={onExit} className="text-slate-500 hover:text-white text-2xl font-black">
          ✕
        </button>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] border-2 border-slate-800 mb-10 shadow-inner">
        <h4 className="text-white font-black text-2xl mb-8 flex items-center gap-4 italic uppercase">
          <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>{' '}
          Système Verrouillé
        </h4>
        <div className="space-y-8">
          <div>
            <label className="text-[10px] text-slate-500 block mb-3 font-black uppercase tracking-[0.3em]">
              IDENTIFIANT / PAYLOAD
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-slate-950 border-4 border-slate-800 p-5 rounded-2xl text-emerald-500 outline-none focus:border-emerald-500 transition-colors text-xl font-mono"
              placeholder="Ex: admin' OR '1'='1"
            />
          </div>
          <button
            onClick={testInjection}
            className="w-full bg-emerald-600 py-6 rounded-3xl text-slate-950 font-black text-xl hover:bg-emerald-500 transition-all active:scale-95 shadow-xl italic tracking-tighter uppercase"
          >
            EXÉCUTER L'INJECTION
          </button>
        </div>
      </div>

      {status === 'success' && (
        <div className="text-emerald-500 animate-in slide-in-from-top-6 space-y-2 border-l-4 border-emerald-500 pl-6 py-2">
          <p className="font-black text-xl">[+] INJECTION RÉUSSIE</p>
          <p className="text-xs opacity-70">[+] EXTRATION DES HASHES ADMIN...</p>
          <p className="text-xs opacity-70">[+] DB_DUMP: complete (248 records)</p>
          <button
            onClick={() => {
              setStatus('idle');
              setInput('');
            }}
            className="mt-8 text-xs underline font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            Réinitialiser le lab
          </button>
        </div>
      )}

      {status === 'fail' && (
        <p className="text-red-500 font-black animate-pulse italic text-lg">
          [!] ERREUR SQL : Identifiants invalides. Pare-feu actif.
        </p>
      )}
    </div>
  );
};

const WhackAHacker = ({ onExit }: { onExit: () => void }) => {
  const [score, setScore] = useState(0);
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [hitMole, setHitMole] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const spawnInterval = Math.max(300, 1000 - Math.floor(score / 400) * 100);

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing') {
      timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    let interval: any;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setActiveMole(Math.floor(Math.random() * 9));
        setTimeout(() => setActiveMole(null), spawnInterval * 0.8);
      }, spawnInterval);
    }
    return () => clearInterval(interval);
  }, [gameState, spawnInterval]);

  const handleWhack = (idx: number) => {
    if (idx === activeMole && gameState === 'playing' && hitMole !== idx) {
      setScore((s) => s + 100);
      setHitMole(idx);
      setActiveMole(null);
      setTimeout(() => setHitMole(null), 200);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95">
      <div className="flex justify-between items-center bg-slate-900 p-8 rounded-[3rem] border-2 border-slate-800 shadow-2xl">
        <button
          onClick={onExit}
          className="text-slate-500 font-black hover:text-white uppercase tracking-widest text-[10px]"
        >
          ← QUITTER LE JEU
        </button>
        <div className="flex gap-10">
          <div className="text-center">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              XP
            </span>
            <span className="font-mono text-3xl text-white font-black">{score}</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              TIME
            </span>
            <span className="font-mono text-3xl text-orange-500 font-black">{timeLeft}s</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6 bg-slate-950 p-8 rounded-[4rem] border-4 border-slate-900 shadow-inner">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            onMouseDown={() => handleWhack(i)}
            className={`aspect-square bg-slate-900 rounded-[2.5rem] border-4 flex items-center justify-center cursor-crosshair transition-all duration-75 relative overflow-hidden ${activeMole === i ? 'border-orange-500 bg-slate-800 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : 'border-slate-800 opacity-30'}`}
          >
            {activeMole === i && <div className="text-6xl animate-bounce">👺</div>}
            {hitMole === i && <div className="text-6xl animate-ping">💥</div>}
          </div>
        ))}
      </div>
      {gameState === 'idle' && (
        <div className="text-center p-16 bg-slate-900 rounded-[4rem] border-2 border-slate-800 shadow-2xl">
          <h3 className="text-5xl font-black mb-6 text-white uppercase italic tracking-tighter">
            Hacker Hunt
          </h3>
          <p className="text-slate-500 mb-10 text-lg">
            Vitesse de réaction maximale exigée. Éliminez toute intrusion détectée.
          </p>
          <button
            onClick={() => {
              setGameState('playing');
              setTimeLeft(30);
              setScore(0);
            }}
            className="px-20 py-6 bg-orange-600 hover:bg-orange-500 rounded-3xl font-black text-white shadow-xl active:scale-95 italic text-2xl"
          >
            START HUNT
          </button>
        </div>
      )}
      {timeLeft === 0 && (
        <div className="text-center p-16 bg-slate-900 rounded-[4rem] border-2 border-slate-800 shadow-2xl">
          <h3 className="text-4xl font-black mb-4 text-white uppercase italic">SESSION TERMINÉE</h3>
          <p className="text-slate-400 mb-10 text-xl font-bold italic uppercase tracking-widest">
            Infiltration stoppée à {score} XP.
          </p>
          <button
            onClick={() => setGameState('idle')}
            className="px-16 py-5 bg-slate-800 hover:bg-slate-700 rounded-3xl font-black text-white active:scale-95 transition-all text-xl uppercase italic"
          >
            RÉESSAYER
          </button>
        </div>
      )}
    </div>
  );
};

export default GamesHub;
