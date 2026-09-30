import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Medal, Award, RefreshCw, Eye, EyeOff, Star } from 'lucide-react';
import { Card, PageHeader, StateBox, Avatar, useL } from '../components/ui';
import {
  fetchLeaderboard,
  setLeaderboardVisibility,
  LeaderboardResponse,
  LeaderboardEntry,
} from '../services/communityApi';

interface LeaderboardProps {
  onBack?: () => void;
}

const MEDAL_STYLE = [
  'from-amber-300 to-amber-500 text-amber-950',
  'from-slate-200 to-slate-400 text-slate-900',
  'from-orange-300 to-orange-500 text-orange-950',
];

export const Leaderboard: React.FC<LeaderboardProps> = () => {
  const L = useL();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setData(await fetchLeaderboard());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleVisibility = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await setLeaderboardVisibility(!data.me.visible);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const podium = data?.entries.slice(0, 3) ?? [];
  // Ordre visuel du podium : 2e, 1er, 3e
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardEntry[];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1">
      <PageHeader
        icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
        title={L('Classements', 'Leaderboard', 'Clasificaciones')}
        subtitle={L(
          'Les membres qui ont cumulé le plus de points d’expérience.',
          'Members who earned the most experience points.',
          'Los miembros con más puntos de experiencia.',
        )}
        actions={
          <button
            onClick={() => void load()}
            disabled={state === 'loading'}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 dark:border-white/10 dark:bg-ink-800 dark:text-slate-200 dark:hover:bg-ink-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${state === 'loading' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {L('Actualiser', 'Refresh', 'Actualizar')}
          </button>
        }
      />

      {state === 'loading' && !data && (
        <StateBox
          kind="loading"
          title={L('Chargement du classement…', 'Loading leaderboard…', 'Cargando clasificación…')}
        />
      )}

      {state === 'error' && (
        <StateBox
          kind="error"
          title={L(
            'Impossible de charger le classement',
            'Could not load the leaderboard',
            'No se pudo cargar la clasificación',
          )}
          hint={L(
            'Vérifiez votre connexion. Le classement nécessite d’être connecté.',
            'Check your connection. The leaderboard requires you to be signed in.',
            'Comprueba tu conexión. La clasificación requiere iniciar sesión.',
          )}
          action={{ label: L('Réessayer', 'Retry', 'Reintentar'), onClick: () => void load() }}
        />
      )}

      {data && state !== 'error' && (
        <>
          {/* Ma position */}
          <Card className="flex flex-col gap-4 bg-gradient-to-r from-brand to-violet-600 p-5 text-white dark:from-brand dark:to-violet-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black">
                {data.me.rank ? `#${data.me.rank}` : '—'}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                  {L('Ma position', 'My rank', 'Mi posición')}
                </p>
                <p className="text-lg font-black">
                  {data.me.rank
                    ? L(
                        `${data.me.rank}e du classement`,
                        `Ranked #${data.me.rank}`,
                        `Puesto ${data.me.rank}`,
                      )
                    : data.me.visible
                      ? L(
                          'Gagnez des points pour entrer',
                          'Earn points to enter',
                          'Gana puntos para entrar',
                        )
                      : L('Vous êtes masqué', 'You are hidden', 'Estás oculto')}
                </p>
                <p className="text-xs text-white/80">
                  {data.me.points} XP · {L('Niveau', 'Level', 'Nivel')} {data.me.level}
                </p>
              </div>
            </div>
            <button
              onClick={() => void toggleVisibility()}
              disabled={saving}
              aria-pressed={data.me.visible}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
            >
              {data.me.visible ? (
                <Eye className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              )}
              {data.me.visible
                ? L(
                    'Je apparais dans le classement',
                    'I appear on the leaderboard',
                    'Aparezco en la clasificación',
                  )
                : L(
                    'Je suis masqué du classement',
                    'I am hidden from the leaderboard',
                    'Estoy oculto de la clasificación',
                  )}
            </button>
          </Card>

          {data.entries.length === 0 ? (
            <StateBox
              kind="empty"
              title={L(
                'Le classement est vide pour le moment',
                'The leaderboard is empty for now',
                'La clasificación está vacía por ahora',
              )}
              hint={L(
                'Terminez une leçon, un quiz ou un défi CTF pour gagner vos premiers points.',
                'Finish a lesson, a quiz or a CTF challenge to earn your first points.',
                'Termina una lección, un quiz o un reto CTF para ganar tus primeros puntos.',
              )}
            />
          ) : (
            <>
              {/* Podium */}
              {podiumOrder.length > 0 && (
                <div
                  className="flex items-end justify-center gap-2 sm:gap-4"
                  aria-label={L('Podium', 'Podium', 'Podio')}
                >
                  {podiumOrder.map((e) => {
                    const first = e.rank === 1;
                    return (
                      <Card
                        key={e.rank}
                        className={`flex w-full max-w-[13rem] flex-1 flex-col items-center gap-1.5 px-2 py-4 text-center ${first ? 'pb-7 pt-6 ring-2 ring-gold' : ''}`}
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${MEDAL_STYLE[e.rank - 1]}`}
                        >
                          {first ? (
                            <Trophy className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <Medal className="h-5 w-5" aria-hidden="true" />
                          )}
                        </div>
                        <Avatar name={e.name} className="h-11 w-11 text-sm" />
                        <p className="max-w-full truncate text-xs font-black sm:text-sm">
                          {e.name}
                          {e.isMe && (
                            <span className="ml-1 text-brand">({L('moi', 'me', 'yo')})</span>
                          )}
                        </p>
                        <p className="text-sm font-black text-brand dark:text-brand-light">
                          {e.points} XP
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {L('Niveau', 'Level', 'Nivel')} {e.level}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Liste complète */}
              <Card className="overflow-hidden">
                <ol>
                  {data.entries.map((e) => (
                    <li
                      key={e.rank}
                      className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-white/5 ${
                        e.isMe ? 'bg-brand/10' : ''
                      }`}
                      aria-current={e.isMe ? 'true' : undefined}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          e.rank <= 3
                            ? `bg-gradient-to-br ${MEDAL_STYLE[e.rank - 1]}`
                            : 'bg-slate-100 text-slate-600 dark:bg-ink-700 dark:text-slate-300'
                        }`}
                      >
                        {e.rank}
                      </span>
                      <Avatar name={e.name} className="h-9 w-9 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {e.name}
                          {e.isMe && (
                            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-black text-white">
                              {L('Vous', 'You', 'Tú')}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {e.title}
                        </p>
                      </div>
                      <div
                        className="hidden items-center gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex"
                        title={L('Certificats', 'Certificates', 'Certificados')}
                      >
                        <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        {e.certificates}
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                        <Star className="h-3 w-3" aria-hidden="true" />
                        {e.level}
                      </div>
                      <p className="w-20 text-right text-sm font-black tabular-nums text-slate-900 dark:text-white">
                        {e.points} <span className="text-[10px] font-bold text-slate-400">XP</span>
                      </p>
                    </li>
                  ))}
                </ol>
              </Card>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                {L(
                  'Seuls votre prénom et l’initiale de votre nom sont visibles. Vous pouvez vous masquer à tout moment.',
                  'Only your first name and last initial are visible. You can hide yourself at any time.',
                  'Solo se ven tu nombre y la inicial de tu apellido. Puedes ocultarte en cualquier momento.',
                )}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
