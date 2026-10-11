import React, { useCallback, useEffect, useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  RefreshCw,
  Eye,
  EyeOff,
  Star,
  Brain,
  Flag,
  BookOpen,
  Gamepad2,
  ScanFace,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { Card, PageHeader, StateBox, Avatar, useL } from '../components/ui';
import {
  fetchLeaderboard,
  setLeaderboardVisibility,
  LeaderboardBoard,
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
  const [board, setBoard] = useState<LeaderboardBoard>('xp');

  const BOARDS: Record<
    LeaderboardBoard,
    {
      label: string;
      icon: React.ReactNode;
      unit: string;
      detail?: (n: number) => string;
      subtitle: string;
      empty: string;
    }
  > = {
    xp: {
      label: L('Général', 'Overall', 'General'),
      icon: <Star className="h-4 w-4" />,
      unit: 'XP',
      subtitle: L(
        'Les membres qui ont cumulé le plus de points d’expérience.',
        'Members who earned the most experience points.',
        'Los miembros con más puntos de experiencia.',
      ),
      empty: L(
        'Terminez une leçon, un quiz ou un défi CTF pour gagner vos premiers points.',
        'Finish a lesson, a quiz or a CTF challenge to earn your first points.',
        'Termina una lección, un quiz o un reto CTF para ganar tus primeros puntos.',
      ),
    },
    courses: {
      label: L('Cours', 'Courses', 'Cursos'),
      icon: <BookOpen className="h-4 w-4" />,
      unit: L('pts', 'pts', 'pts'),
      detail: (n) => L(`${n} leçons`, `${n} lessons`, `${n} lecciones`),
      subtitle: L(
        'Points gagnés en terminant des leçons et en réussissant des examens.',
        'Points earned by finishing lessons and passing exams.',
        'Puntos ganados al terminar lecciones y aprobar exámenes.',
      ),
      empty: L(
        'Terminez une leçon pour apparaître ici.',
        'Finish a lesson to appear here.',
        'Termina una lección para aparecer aquí.',
      ),
    },
    quizSolo: {
      label: L('Quiz solo', 'Solo quiz', 'Quiz solo'),
      icon: <Brain className="h-4 w-4" />,
      unit: L('bonnes rép.', 'correct', 'aciertos'),
      detail: (n) => L(`${n} parties`, `${n} games`, `${n} partidas`),
      subtitle: L(
        'Les membres avec le plus de bonnes réponses en quiz solo.',
        'Members with the most correct answers in solo quizzes.',
        'Los miembros con más respuestas correctas en quiz solo.',
      ),
      empty: L(
        'Jouez un quiz pour apparaître ici.',
        'Play a quiz to appear here.',
        'Juega un quiz para aparecer aquí.',
      ),
    },
    quizMulti: {
      label: L('Quiz multi', 'Multiplayer quiz', 'Quiz multijugador'),
      icon: <Brain className="h-4 w-4" />,
      unit: L('bonnes rép.', 'correct', 'aciertos'),
      detail: (n) => L(`${n} parties`, `${n} games`, `${n} partidas`),
      subtitle: L(
        'Les membres avec le plus de bonnes réponses en quiz multijoueur.',
        'Members with the most correct answers in multiplayer quizzes.',
        'Los miembros con más respuestas correctas en quiz multijugador.',
      ),
      empty: L(
        'Terminez un quiz multijoueur pour apparaître ici.',
        'Finish a multiplayer quiz to appear here.',
        'Termina un quiz multijugador para aparecer aquí.',
      ),
    },
    games: {
      label: L('Jeux', 'Games', 'Juegos'),
      icon: <Gamepad2 className="h-4 w-4" />,
      unit: 'XP',
      subtitle: L(
        'Les points d’expérience gagnés dans les mini-jeux.',
        'Experience points earned in the mini-games.',
        'Puntos de experiencia ganados en los minijuegos.',
      ),
      empty: L(
        'Terminez un mini-jeu pour apparaître ici.',
        'Finish a mini-game to appear here.',
        'Termina un minijuego para aparecer aquí.',
      ),
    },
    deepfake: {
      label: 'Deepfake',
      icon: <ScanFace className="h-4 w-4" />,
      unit: 'XP',
      subtitle: L(
        'Les points gagnés au détecteur et au défi deepfake.',
        'Points earned in the deepfake detector and challenge.',
        'Puntos ganados en el detector y el reto deepfake.',
      ),
      empty: L(
        'Relevez un défi deepfake pour apparaître ici.',
        'Take a deepfake challenge to appear here.',
        'Acepta un reto deepfake para aparecer aquí.',
      ),
    },
    lab: {
      label: L('Labo', 'Lab', 'Laboratorio'),
      icon: <FlaskConical className="h-4 w-4" />,
      unit: 'XP',
      subtitle: L(
        'Les points gagnés dans les laboratoires pratiques.',
        'Points earned in the hands-on labs.',
        'Puntos ganados en los laboratorios prácticos.',
      ),
      empty: L(
        'Terminez un laboratoire pour apparaître ici.',
        'Complete a lab to appear here.',
        'Completa un laboratorio para aparecer aquí.',
      ),
    },
    practices: {
      label: L('Bonnes pratiques', 'Best practices', 'Buenas prácticas'),
      icon: <ShieldCheck className="h-4 w-4" />,
      unit: 'XP',
      subtitle: L(
        'Les points gagnés avec les bonnes pratiques de sécurité.',
        'Points earned with security best practices.',
        'Puntos ganados con las buenas prácticas de seguridad.',
      ),
      empty: L(
        'Validez une bonne pratique pour apparaître ici.',
        'Check off a best practice to appear here.',
        'Marca una buena práctica para aparecer aquí.',
      ),
    },
    ctfSolo: {
      label: 'CTF solo',
      icon: <Flag className="h-4 w-4" />,
      unit: L('pts', 'pts', 'pts'),
      detail: (n) => L(`${n} défis`, `${n} challenges`, `${n} retos`),
      subtitle: L(
        'Les points des défis résolus dans l’arène CTF solo.',
        'Points from challenges solved in the solo CTF arena.',
        'Puntos de los retos resueltos en la arena CTF solo.',
      ),
      empty: L(
        'Résolvez un défi dans l’arène CTF solo pour apparaître ici.',
        'Solve a challenge in the solo CTF arena to appear here.',
        'Resuelve un reto en la arena CTF solo para aparecer aquí.',
      ),
    },
    ctfMulti: {
      label: L('CTF multi', 'Multiplayer CTF', 'CTF multijugador'),
      icon: <Flag className="h-4 w-4" />,
      unit: L('pts', 'pts', 'pts'),
      detail: (n) => L(`${n} défis`, `${n} challenges`, `${n} retos`),
      subtitle: L(
        'Les membres qui ont marqué le plus de points sur les défis CTF en salle.',
        'Members who scored the most points on room CTF challenges.',
        'Los miembros con más puntos en los retos CTF en sala.',
      ),
      empty: L(
        'Résolvez un défi dans une salle CTF multijoueur pour apparaître ici.',
        'Solve a challenge in a multiplayer CTF room to appear here.',
        'Resuelve un reto en una sala CTF multijugador para aparecer aquí.',
      ),
    },
  };
  const cfg = BOARDS[board];
  const unit = cfg.unit;
  const subtitle = cfg.subtitle;
  const emptyHint = cfg.empty;
  const detailLabel = (n: number) => cfg.detail?.(n) ?? '';
  // Onglets principaux : Quiz et CTF regroupent leurs classements solo et multijoueur (choix en dessous)
  const GROUPS: { id: string; label: string; icon: React.ReactNode; boards: LeaderboardBoard[] }[] =
    [
      { id: 'xp', boards: ['xp'] },
      { id: 'courses', boards: ['courses'] },
      { id: 'quiz', boards: ['quizSolo', 'quizMulti'] },
      { id: 'ctf', boards: ['ctfSolo', 'ctfMulti'] },
      { id: 'games', boards: ['games'] },
      { id: 'deepfake', boards: ['deepfake'] },
      { id: 'lab', boards: ['lab'] },
      { id: 'practices', boards: ['practices'] },
    ].map((g) => ({
      ...g,
      boards: g.boards as LeaderboardBoard[],
      label:
        g.id === 'quiz'
          ? 'Quiz'
          : g.id === 'ctf'
            ? 'CTF'
            : BOARDS[g.boards[0] as LeaderboardBoard].label,
      icon: BOARDS[g.boards[0] as LeaderboardBoard].icon,
    }));
  const group = GROUPS.find((g) => g.boards.includes(board)) ?? GROUPS[0];
  const switchBoard = (next: LeaderboardBoard) => {
    if (next === board) return;
    setData(null);
    setBoard(next);
  };

  const load = useCallback(async () => {
    setState('loading');
    try {
      setData(await fetchLeaderboard(board));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [board]);

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
        subtitle={subtitle}
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

      <div
        role="tablist"
        aria-label={L('Type de classement', 'Leaderboard type', 'Tipo de clasificación')}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-ink-800"
      >
        {GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group.id === g.id}
            onClick={() => switchBoard(g.boards[0])}
            className={`inline-flex shrink-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              group.id === g.id
                ? 'bg-brand text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-ink-700'
            }`}
          >
            <span aria-hidden="true">{g.icon}</span>
            {g.label}
          </button>
        ))}
      </div>

      {group.boards.length > 1 && (
        <div
          role="tablist"
          aria-label={L('Mode de jeu', 'Game mode', 'Modo de juego')}
          className="flex gap-2"
        >
          {group.boards.map((id, i) => (
            <button
              key={id}
              role="tab"
              aria-selected={board === id}
              onClick={() => switchBoard(id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                board === id
                  ? 'border-brand bg-brand/10 text-brand dark:text-brand-light'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-ink-700'
              }`}
            >
              {i === 0
                ? L('Solo', 'Solo', 'Solo')
                : L('Multijoueur', 'Multiplayer', 'Multijugador')}
            </button>
          ))}
        </div>
      )}

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
                  {[
                    `${data.me.points} ${unit}`,
                    board === 'xp'
                      ? `${L('Niveau', 'Level', 'Nivel')} ${data.me.level}`
                      : detailLabel(data.me.detail),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
              hint={emptyHint}
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
                          {e.points} {unit}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {board === 'xp'
                            ? `${L('Niveau', 'Level', 'Nivel')} ${e.level}`
                            : detailLabel(e.detail)}
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
                      <p className="w-24 text-right text-sm font-black tabular-nums text-slate-900 dark:text-white">
                        {e.points}{' '}
                        <span className="text-[10px] font-bold text-slate-400">{unit}</span>
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
