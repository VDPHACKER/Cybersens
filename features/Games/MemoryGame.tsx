import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Skull, ShieldCheck } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { useI18n } from '../../services/i18n';
import { useL } from '../../components/ui';
import { GameShell, GameResult, Stat, shuffle, ringClass } from './GameShell';

type T3 = [string, string, string]; // [fr, en, es]

// Chaque paire associe une menace à sa meilleure parade.
const PAIRS: { threat: T3; defense: T3 }[] = [
  {
    threat: ['Phishing', 'Phishing', 'Phishing'],
    defense: [
      'Vérifier l’expéditeur et le lien',
      'Check the sender and the link',
      'Verificar remitente y enlace',
    ],
  },
  {
    threat: ['Rançongiciel', 'Ransomware', 'Ransomware'],
    defense: ['Sauvegardes hors ligne', 'Offline backups', 'Copias sin conexión'],
  },
  {
    threat: ['Mot de passe faible', 'Weak password', 'Contraseña débil'],
    defense: ['Gestionnaire de mots de passe', 'Password manager', 'Gestor de contraseñas'],
  },
  { threat: ['Wi-Fi public', 'Public Wi-Fi', 'Wi-Fi público'], defense: ['VPN', 'VPN', 'VPN'] },
  {
    threat: ['Logiciel obsolète', 'Outdated software', 'Software obsoleto'],
    defense: ['Mises à jour', 'Updates', 'Actualizaciones'],
  },
  {
    threat: ['Vol de compte', 'Account takeover', 'Robo de cuenta'],
    defense: [
      'Double authentification (2FA)',
      'Two-factor authentication (2FA)',
      'Doble autenticación (2FA)',
    ],
  },
];

interface CardData {
  uid: string;
  pair: number;
  kind: 'threat' | 'defense';
}

const MemoryGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const L = useL();
  const { language } = useI18n();
  const idx = language === 'en' ? 1 : language === 'es' ? 2 : 0;
  const [seed, setSeed] = useState(0);
  const cards = useMemo<CardData[]>(
    () =>
      shuffle(
        PAIRS.flatMap((_, i) => [
          { uid: `t${i}`, pair: i, kind: 'threat' as const },
          { uid: `d${i}`, pair: i, kind: 'defense' as const },
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const lock = useRef(false);
  const done = matched.size === PAIRS.length;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [done, seed]);

  const flip = (c: CardData) => {
    if (lock.current || done || matched.has(c.pair) || open.includes(c.uid)) return;
    audioService.playClick();
    const next = [...open, c.uid];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next.map((uid) => cards.find((x) => x.uid === uid)!);
    if (a.pair === b.pair) {
      setMatched((m) => new Set(m).add(a.pair));
      setOpen([]);
      audioService.playSuccess();
    } else {
      lock.current = true;
      setTimeout(() => {
        setOpen([]);
        lock.current = false;
      }, 900);
    }
  };

  const replay = () => {
    setSeed((s) => s + 1);
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    lock.current = false;
  };

  const xp = moves <= 8 ? 20 : moves <= 12 ? 15 : moves <= 16 ? 10 : 5;
  const verdict =
    moves <= 8
      ? L('Mémoire d’éléphant !', 'Elephant memory!', '¡Memoria de elefante!')
      : moves <= 14
        ? L('Bien joué', 'Well played', 'Bien jugado')
        : L('Entraînez-vous encore', 'Keep practising', 'Siga practicando');

  return (
    <GameShell
      title={L('Mémoire cyber', 'Cyber memory', 'Memoria cibernética')}
      subtitle={L(
        'Associez chaque menace à la bonne parade.',
        'Match each threat with the right defence.',
        'Empareje cada amenaza con su defensa.',
      )}
      icon={Brain}
      tone="from-violet-500 to-indigo-700"
      onExit={onExit}
      right={
        !done && (
          <div className="flex gap-2">
            <Stat label={L('Coups', 'Moves', 'Jugadas')} value={moves} />
            <Stat label={L('Temps', 'Time', 'Tiempo')} value={`${seconds}s`} />
          </div>
        )
      }
    >
      {done ? (
        <GameResult
          score={PAIRS.length}
          total={PAIRS.length}
          xp={xp}
          verdict={verdict}
          detail={`${moves} ${L('coups', 'moves', 'jugadas')} · ${seconds} s`}
          onReplay={replay}
          onExit={onExit}
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {cards.map((c) => {
            const isOpen = open.includes(c.uid) || matched.has(c.pair);
            const data = PAIRS[c.pair][c.kind][idx];
            const Icon = c.kind === 'threat' ? Skull : ShieldCheck;
            return (
              <button
                key={c.uid}
                onClick={() => flip(c)}
                aria-label={isOpen ? data : L('Carte cachée', 'Hidden card', 'Carta oculta')}
                aria-pressed={isOpen}
                className={`flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-black leading-tight transition-all sm:text-sm ${ringClass} ${
                  matched.has(c.pair)
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                    : isOpen
                      ? c.kind === 'threat'
                        ? 'border-rose-400/50 bg-rose-500/15 text-rose-100'
                        : 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                      : 'border-white/10 bg-gradient-to-br from-ink-700 to-ink-800 text-slate-500 hover:border-cyan-400/40'
                }`}
              >
                {isOpen ? (
                  <>
                    <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <span>{data}</span>
                  </>
                ) : (
                  <Brain className="h-8 w-8 opacity-40" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </GameShell>
  );
};

export default MemoryGame;
