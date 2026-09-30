import React, { useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Sparkles, type LucideIcon } from 'lucide-react';
import { addPoints } from '../../services/persistenceService';
import { useL } from '../../components/ui';

// Éléments communs des mini-jeux : en-tête, écran de résultat et attribution des points d'expérience.
// Les jeux s'affichent dans un cadre sombre (ArenaSurface) : les couleurs sont donc pensées pour ce fond.

export const MAX_GAME_XP = 20;

export const ringClass =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950';

interface ShellProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string; // dégradé Tailwind, ex. « from-rose-500 to-red-700 »
  onExit: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export const GameShell: React.FC<ShellProps> = ({
  title,
  subtitle,
  icon: Icon,
  tone,
  onExit,
  right,
  children,
}) => {
  const L = useL();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onExit}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white ${ringClass}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {L('Retour aux jeux', 'Back to games', 'Volver a los juegos')}
        </button>
        {right}
      </div>
      <header className="flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
      </header>
      {children}
    </div>
  );
};

/** Chip d'information (score, temps, coups…) affichée en haut du jeu. */
export const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({
  label,
  value,
  tone = 'text-white',
}) => (
  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
    <div className={`text-lg font-black tabular-nums leading-none ${tone}`}>{value}</div>
    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </div>
  </div>
);

interface ResultProps {
  score: number;
  total: number;
  xp: number; // points d'expérience gagnés (0 à MAX_GAME_XP)
  verdict: string;
  detail?: string;
  onReplay: () => void;
  onExit: () => void;
}

/** Écran de fin : verse les points une seule fois à l'affichage. */
export const GameResult: React.FC<ResultProps> = ({
  score,
  total,
  xp,
  verdict,
  detail,
  onReplay,
  onExit,
}) => {
  const L = useL();
  const awarded = useRef(false);
  const gain = Math.max(0, Math.min(MAX_GAME_XP, Math.round(xp)));

  useEffect(() => {
    if (awarded.current) return;
    awarded.current = true;
    if (gain > 0) addPoints(gain);
  }, [gain]);

  return (
    <div
      className="rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 p-8 text-center"
      role="status"
    >
      <Trophy className="mx-auto h-12 w-12 text-amber-400" aria-hidden="true" />
      <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
        {L('Terminé', 'Finished', 'Terminado')}
      </p>
      <p className="mt-1 text-5xl font-black text-white tabular-nums">
        {score}
        <span className="text-2xl text-slate-500"> / {total}</span>
      </p>
      <p className="mt-3 text-lg font-black text-cyan-300">{verdict}</p>
      {detail && <p className="mt-1 text-sm text-slate-400">{detail}</p>}
      {gain > 0 && (
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-4 py-2 text-sm font-black text-amber-300">
          <Sparkles className="h-4 w-4" aria-hidden="true" />+{gain} XP
        </p>
      )}
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          onClick={onReplay}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-black text-white transition-colors hover:bg-brand-light ${ringClass}`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {L('Rejouer', 'Play again', 'Jugar de nuevo')}
        </button>
        <button
          onClick={onExit}
          className={`rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-white/5 ${ringClass}`}
        >
          {L('Tous les jeux', 'All games', 'Todos los juegos')}
        </button>
      </div>
    </div>
  );
};

export const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = <T,>(items: T[], n: number): T[] => shuffle(items).slice(0, n);
