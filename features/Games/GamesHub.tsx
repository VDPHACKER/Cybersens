import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioService } from '../../services/audioService';
import AiThreatsGame from './AiThreatsGame';
import PhishingGame from './PhishingGame';
import FirewallGame from './FirewallGame';
import MemoryGame from './MemoryGame';
import CipherGame from './CipherGame';
import { useL } from '../../components/ui';
import {
  Zap,
  LockKeyhole,
  Syringe,
  Skull,
  Brain,
  Bomb,
  Fish,
  BrickWall,
  KeyRound,
  Puzzle,
  ArrowRight,
  Clock,
  Gamepad2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

type GameID =
  | 'ai_threats'
  | 'whack'
  | 'bruteforce'
  | 'sqli'
  | 'ddos'
  | 'phishing'
  | 'firewall'
  | 'memory'
  | 'cipher';
type Tag = 'all' | 'reflexes' | 'attaque' | 'defense' | 'crypto' | 'ia';

interface GamesHubProps {
  onBack: () => void;
}

interface GameMeta {
  id: GameID;
  tag: Exclude<Tag, 'all'>;
  level: 1 | 2 | 3;
  minutes: number;
  icon: LucideIcon;
  tone: string;
  isNew?: boolean;
}

const GAMES: GameMeta[] = [
  {
    id: 'phishing',
    tag: 'defense',
    level: 1,
    minutes: 3,
    icon: Fish,
    tone: 'from-rose-500 to-red-700',
    isNew: true,
  },
  {
    id: 'firewall',
    tag: 'defense',
    level: 2,
    minutes: 4,
    icon: BrickWall,
    tone: 'from-orange-500 to-red-700',
    isNew: true,
  },
  {
    id: 'memory',
    tag: 'reflexes',
    level: 1,
    minutes: 3,
    icon: Puzzle,
    tone: 'from-violet-500 to-indigo-700',
    isNew: true,
  },
  {
    id: 'cipher',
    tag: 'crypto',
    level: 2,
    minutes: 2,
    icon: KeyRound,
    tone: 'from-cyan-500 to-blue-700',
    isNew: true,
  },
  { id: 'ddos', tag: 'defense', level: 2, minutes: 3, icon: Zap, tone: 'from-red-500 to-rose-800' },
  {
    id: 'bruteforce',
    tag: 'crypto',
    level: 2,
    minutes: 3,
    icon: LockKeyhole,
    tone: 'from-blue-500 to-blue-800',
  },
  {
    id: 'sqli',
    tag: 'attaque',
    level: 3,
    minutes: 4,
    icon: Syringe,
    tone: 'from-emerald-500 to-teal-800',
  },
  {
    id: 'whack',
    tag: 'reflexes',
    level: 1,
    minutes: 2,
    icon: Skull,
    tone: 'from-amber-500 to-orange-700',
  },
];

const GamesHub: React.FC<GamesHubProps> = ({ onBack }) => {
  const L = useL();
  const [activeGame, setActiveGame] = useState<null | GameID>(null);
  const [filter, setFilter] = useState<Tag>('all');
  const exit = () => setActiveGame(null);

  if (activeGame === 'ai_threats') return <AiThreatsGame onExit={exit} />;
  if (activeGame === 'whack') return <WhackAHacker onExit={exit} />;
  if (activeGame === 'bruteforce') return <BruteForceGame onExit={exit} />;
  if (activeGame === 'sqli') return <SqlInjectionGame onExit={exit} />;
  if (activeGame === 'ddos') return <DdosDefenseGame onExit={exit} />;
  if (activeGame === 'phishing') return <PhishingGame onExit={exit} />;
  if (activeGame === 'firewall') return <FirewallGame onExit={exit} />;
  if (activeGame === 'memory') return <MemoryGame onExit={exit} />;
  if (activeGame === 'cipher') return <CipherGame onExit={exit} />;

  const text: Record<Exclude<GameID, 'ai_threats'>, { title: string; desc: string }> = {
    phishing: {
      title: L('Phishing ou légitime ?', 'Phishing or legit?', '¿Phishing o legítimo?'),
      desc: L(
        'Repérez les liens et SMS piégés avant de cliquer.',
        'Spot trapped links and SMS before you click.',
        'Detecte enlaces y SMS trampa antes de hacer clic.',
      ),
    },
    firewall: {
      title: L('Pare-feu', 'Firewall', 'Cortafuegos'),
      desc: L(
        'Autorisez ou bloquez les paquets selon les règles.',
        'Allow or block packets according to the rules.',
        'Permita o bloquee paquetes según las reglas.',
      ),
    },
    memory: {
      title: L('Mémoire cyber', 'Cyber memory', 'Memoria cibernética'),
      desc: L(
        'Associez chaque menace à la bonne parade.',
        'Match each threat with the right defence.',
        'Empareje cada amenaza con su defensa.',
      ),
    },
    cipher: {
      title: L('Décodeur César', 'Caesar decoder', 'Decodificador César'),
      desc: L(
        'Déchiffrez un maximum de mots en 90 secondes.',
        'Decrypt as many words as you can in 90 seconds.',
        'Descifre tantas palabras como pueda en 90 segundos.',
      ),
    },
    ddos: {
      title: L('Défense DDoS', 'DDoS Defense', 'Defensa DDoS'),
      desc: L(
        'Gardez le serveur en ligne sous une pluie de requêtes.',
        'Keep the server online under a flood of requests.',
        'Mantenga el servidor en línea bajo una avalancha de peticiones.',
      ),
    },
    bruteforce: {
      title: L('Lab Brute Force', 'Brute Force Lab', 'Laboratorio Fuerza Bruta'),
      desc: L(
        'Devinez le mot de passe avant le verrouillage.',
        'Guess the password before lockout.',
        'Adivine la contraseña antes del bloqueo.',
      ),
    },
    sqli: {
      title: L('Lab Injection SQL', 'SQL Injection Lab', 'Laboratorio Inyección SQL'),
      desc: L(
        'Forcez l’accès à une base de données mal protégée.',
        'Break into a poorly protected database.',
        'Acceda a una base de datos mal protegida.',
      ),
    },
    whack: {
      title: L('Attaque Hacker', 'Hacker Attack', 'Ataque Hacker'),
      desc: L(
        'Réflexes purs : neutralisez les menaces avant le pare-feu.',
        'Pure reflexes: neutralise threats before the firewall.',
        'Reflejos puros: neutralice amenazas antes del cortafuegos.',
      ),
    },
  };

  const tags: { id: Tag; label: string }[] = [
    { id: 'all', label: L('Tous', 'All', 'Todos') },
    { id: 'defense', label: L('Défense', 'Defence', 'Defensa') },
    { id: 'attaque', label: L('Attaque', 'Attack', 'Ataque') },
    { id: 'crypto', label: L('Crypto', 'Crypto', 'Cripto') },
    { id: 'reflexes', label: L('Réflexes', 'Reflexes', 'Reflejos') },
    { id: 'ia', label: L('IA', 'AI', 'IA') },
  ];
  const tagLabel = (t: Tag) => tags.find((x) => x.id === t)?.label ?? '';
  const levelLabel = (n: number) =>
    [
      L('Facile', 'Easy', 'Fácil'),
      L('Moyen', 'Medium', 'Medio'),
      L('Difficile', 'Hard', 'Difícil'),
    ][n - 1];

  const visible = GAMES.filter((g) => filter === 'all' || g.tag === filter);
  const showFeatured = filter === 'all' || filter === 'ia';
  const total = GAMES.length + 1;

  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-lg">
            <Gamepad2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {L('Mini-jeux', 'Mini-games', 'Minijuegos')}
            </h1>
            <p className="text-sm text-slate-400">
              {L(
                `${total} jeux pour apprendre les réflexes de défense en s’amusant.`,
                `${total} games to learn defence reflexes while having fun.`,
                `${total} juegos para aprender reflejos de defensa jugando.`,
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className={`self-start rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:self-auto ${ring}`}
        >
          {L('Retour à l’accueil', 'Back to home', 'Volver al inicio')}
        </button>
      </div>

      {/* Jeu vedette */}
      {showFeatured && (
        <button
          onClick={() => setActiveGame('ai_threats')}
          className={`group relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/70 via-ink-900 to-indigo-950/60 p-6 text-left transition-colors hover:border-cyan-400 sm:p-8 ${ring}`}
        >
          <Brain
            className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 text-cyan-400/10 transition-opacity group-hover:text-cyan-400/20 sm:h-64 sm:w-64"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-950">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {L('Défi à la une', 'Featured challenge', 'Reto destacado')}
              </span>
              <span className="text-xs font-bold text-cyan-300">
                Prompt Injection • Deepfake • Agent Hijack
              </span>
            </div>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              {L(
                'Chasse aux nouvelles menaces IA',
                'Hunting new AI threats',
                'Caza de nuevas amenazas IA',
              )}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              {L(
                'Incarnez un analyste de sécurité face à la nouvelle vague d’attaques : injections de prompts, clonage vocal de PDG, empoisonnement de données et détournement d’agents autonomes.',
                'Play a security analyst facing the new wave of attacks: prompt injection, CEO voice cloning, data poisoning and autonomous agent hijacking.',
                'Póngase en la piel de un analista de seguridad ante la nueva ola de ataques: inyección de prompts, clonación de voz de directivos, envenenamiento de datos y secuestro de agentes autónomos.',
              )}
            </p>
            <span className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-cyan-700/30 group-hover:bg-cyan-600">
              {L('Lancer la mission', 'Launch the mission', 'Iniciar la misión')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </button>
      )}

      {/* Filtres */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        role="tablist"
        aria-label={L('Filtrer les jeux', 'Filter games', 'Filtrar juegos')}
      >
        {tags.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${ring} ${
              filter === t.id
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grille de jeux */}
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
          {L(
            'Aucun jeu dans cette catégorie pour le moment.',
            'No games in this category yet.',
            'Aún no hay juegos en esta categoría.',
          )}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((g) => {
            const Icon = g.icon;
            const info = text[g.id as Exclude<GameID, 'ai_threats'>];
            return (
              <li key={g.id}>
                <button
                  onClick={() => setActiveGame(g.id)}
                  className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-800/70 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:shadow-xl ${ring}`}
                >
                  <div
                    className={`relative flex h-24 items-center justify-between bg-gradient-to-br ${g.tone} px-5`}
                  >
                    <Icon className="h-11 w-11 text-white drop-shadow" aria-hidden="true" />
                    {g.isNew && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {L('Nouveau', 'New', 'Nuevo')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-black text-white">{info.title}</h3>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">
                      {info.desc}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold text-slate-300">
                      <span className="rounded-full bg-white/10 px-2.5 py-1">
                        {tagLabel(g.tag)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5"
                        aria-label={`${L('Niveau', 'Level', 'Nivel')} : ${levelLabel(g.level)}`}
                      >
                        <span className="flex gap-0.5" aria-hidden="true">
                          {[1, 2, 3].map((n) => (
                            <span
                              key={n}
                              className={`h-1.5 w-3 rounded-full ${n <= g.level ? 'bg-cyan-400' : 'bg-white/15'}`}
                            />
                          ))}
                        </span>
                        {levelLabel(g.level)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {g.minutes} min
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-300 group-hover:text-cyan-200">
                      {L('Jouer', 'Play', 'Jugar')}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

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
            <LockKeyhole className="w-16 h-16 mb-6 mx-auto text-cyan-400" aria-hidden="true" />
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
              WAF {isWafActive ? 'ACTIF' : 'OFF'}
            </button>
            <button
              onClick={() => setIsRateLimitActive(!isRateLimitActive)}
              className={`p-6 rounded-3xl font-black transition-all border-4 text-xl italic ${isRateLimitActive ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-800 text-slate-600 hover:border-blue-500'}`}
            >
              RATE LIMIT {isRateLimitActive ? 'ACTIF' : 'OFF'}
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
            {activeMole === i && (
              <Skull className="w-16 h-16 text-red-400 animate-bounce" aria-hidden="true" />
            )}
            {hitMole === i && (
              <Bomb className="w-16 h-16 text-amber-400 animate-ping" aria-hidden="true" />
            )}
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
