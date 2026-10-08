import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Circle,
  Copy,
  Crown,
  Diamond,
  Loader2,
  Play,
  Square,
  Triangle,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useI18n } from '../../services/i18n';
import { useL } from '../../components/ui';
import {
  RoomState,
  answerRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  restartRoom,
  startRoom,
  watchRoom,
} from '../../services/roomsApi';

/*
 * Quiz multijoueur en salles (type Mentimeter) : un joueur crée la salle et partage le code à 6 chiffres,
 * les autres le saisissent sur leur propre téléphone. Le serveur pilote la partie et le minuteur.
 */

interface RoomQuizProps {
  onExit: () => void;
  initialCode?: string;
}

const OPTION_STYLES = [
  { bg: 'bg-rose-700 hover:bg-rose-600', icon: Triangle },
  { bg: 'bg-sky-700 hover:bg-sky-600', icon: Diamond },
  { bg: 'bg-amber-700 hover:bg-amber-600', icon: Circle },
  { bg: 'bg-emerald-700 hover:bg-emerald-600', icon: Square },
];

const button =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';

const RoomQuiz: React.FC<RoomQuizProps> = ({ onExit, initialCode }) => {
  const L = useL();
  const { language } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [count, setCount] = useState(5);
  const [seconds, setSeconds] = useState(20);
  // Réglages de la prochaine partie (proposés à l'hôte quand la partie est terminée)
  const [nextCount, setNextCount] = useState(5);
  const [nextSeconds, setNextSeconds] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const offset = useRef(0); // décalage entre l'horloge du serveur et celle du téléphone

  const messageOf = (err: unknown) =>
    err instanceof Error
      ? err.message
      : L('Erreur inattendue.', 'Unexpected error.', 'Error inesperado.');

  // Flux temps réel de la salle
  useEffect(() => {
    if (!code) return;
    return watchRoom(
      code,
      (state) => {
        offset.current = state.now - Date.now();
        setRoom(state);
      },
      () => {
        setCode(null);
        setRoom(null);
        setError(
          L(
            'La salle a été fermée ou vous en avez été retiré.',
            'The room was closed or you were removed from it.',
            'La sala se cerró o le han sacado de ella.',
          ),
        );
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Décompte de la question en cours
  useEffect(() => {
    if (room?.phase !== 'question' || !room.deadline) return;
    const deadline = room.deadline;
    const tick = () => setRemaining(Math.max(0, deadline - (Date.now() + offset.current)));
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [room?.phase, room?.index, room?.deadline]);

  // À la fin d'une partie, les réglages proposés pour la suivante sont ceux de la partie qui vient de finir
  useEffect(() => {
    if (room?.phase !== 'finished') return;
    setNextCount(room.total);
    setNextSeconds(room.seconds);
  }, [room?.phase, room?.session, room?.total, room?.seconds]);

  const enter = useCallback(async (action: () => Promise<{ code: string }>) => {
    setBusy(true);
    setError('');
    try {
      setCode((await action()).code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setBusy(false);
    }
  }, []);

  const leave = async () => {
    setCode(null);
    setRoom(null);
    try {
      await leaveRoom();
    } catch {
      /* la salle expirera d'elle-même */
    }
  };

  const shareLink = code ? `${window.location.origin}/?join=${code}` : '';
  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'CyberSens',
          text: L(
            `Rejoins mon quiz CyberSens avec le code ${code}`,
            `Join my CyberSens quiz with code ${code}`,
            `Únete a mi quiz de CyberSens con el código ${code}`,
          ),
          url: shareLink,
        });
      } else {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* partage annulé */
    }
  };

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const header = (
    <button
      onClick={code ? leave : onExit}
      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {code
        ? L('Quitter la salle', 'Leave the room', 'Salir de la sala')
        : L('Retour', 'Back', 'Volver')}
    </button>
  );

  const errorBox = error && (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200"
    >
      {error}
    </div>
  );

  if (code && !room) {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        {header}
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </div>
    );
  }

  /* ---------- Menu : créer ou rejoindre ---------- */
  if (!code || !room) {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-6 animate-in fade-in">
        {header}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {L('Quiz multijoueur', 'Multiplayer quiz', 'Quiz multijugador')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Jouez à plusieurs, chacun sur son téléphone : créez une salle et partagez le code, ou rejoignez celle d’un ami.',
              'Play together, each on their own phone: create a room and share the code, or join a friend’s room.',
              'Jueguen juntos, cada uno en su teléfono: cree una sala y comparta el código, o únase a la de un amigo.',
            )}
          </p>
        </div>

        {errorBox}

        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-xl">
          <h2 className="text-sm font-black">
            {L('Rejoindre une salle', 'Join a room', 'Unirse a una sala')}
          </h2>
          <input
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-label={L('Code de la salle', 'Room code', 'Código de la sala')}
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
          <button
            onClick={() => enter(() => joinRoom(joinCode))}
            disabled={busy || joinCode.length !== 6}
            className={`${button} w-full bg-sky-700 text-white hover:bg-sky-600`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {L('Rejoindre', 'Join', 'Unirse')}
          </button>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            {L('Créer une salle', 'Create a room', 'Crear una sala')}
          </h2>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            {L('Nombre de questions', 'Number of questions', 'Número de preguntas')}
            <OptionPicker values={COUNT_CHOICES} value={count} onChange={setCount} />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            {L('Temps par question', 'Time per question', 'Tiempo por pregunta')}
            <OptionPicker
              values={SECONDS_CHOICES}
              value={seconds}
              onChange={setSeconds}
              format={(n) => `${n} s`}
            />
          </label>
          <button
            onClick={() => enter(() => createRoom({ count, seconds }))}
            disabled={busy}
            className={`${button} w-full bg-indigo-600 text-white hover:bg-indigo-500`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <Users className="h-4 w-4" aria-hidden="true" />
            {L('Créer la salle', 'Create the room', 'Crear la sala')}
          </button>
        </div>
      </div>
    );
  }

  const me = room.you;
  const playersSorted = [...room.players].sort((a, b) => b.score - a.score);

  /* ---------- Salle d'attente ---------- */
  if (room.phase === 'lobby') {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-6 animate-in fade-in">
        {header}
        {errorBox}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
            {L('Code de la salle', 'Room code', 'Código de la sala')}
          </p>
          <p className="mt-2 text-5xl font-black tracking-[0.25em]" aria-live="polite">
            {room.code}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {L(
              'Sur un autre téléphone : Quiz, Multijoueur, puis ce code.',
              'On another phone: Quiz, Multiplayer, then this code.',
              'En otro teléfono: Quiz, Multijugador y este código.',
            )}
          </p>
          <button
            onClick={copyLink}
            className={`${button} mt-4 bg-white/10 text-white hover:bg-white/20`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied
              ? L('Lien copié', 'Link copied', 'Enlace copiado')
              : L('Partager le lien', 'Share the link', 'Compartir el enlace')}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-3 flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
            <span>{L('Joueurs', 'Players', 'Jugadores')}</span>
            <span className="text-xs font-bold text-slate-500">{room.players.length}</span>
          </h2>
          <ul className="space-y-2">
            {room.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${p.connected ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    aria-hidden="true"
                  />
                  {p.name}
                  {p.id === room.hostId && (
                    <Crown className="h-4 w-4 text-amber-500" aria-label="Host" />
                  )}
                </span>
                {p.id === me.id && (
                  <span className="text-[10px] uppercase text-sky-600 dark:text-sky-400">
                    {L('Vous', 'You', 'Tú')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            {room.session > 1 &&
              L(
                `Partie n° ${room.session} • `,
                `Game #${room.session} • `,
                `Partida n.º ${room.session} • `,
              )}
            {L(
              `${room.total} questions • ${room.seconds} s chacune`,
              `${room.total} questions • ${room.seconds} s each`,
              `${room.total} preguntas • ${room.seconds} s cada una`,
            )}
          </p>
        </div>

        {me.isHost ? (
          <button
            onClick={() => run(() => startRoom(room.code))}
            disabled={room.players.length < 2}
            className={`${button} w-full bg-emerald-700 text-white hover:bg-emerald-600`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {room.players.length < 2
              ? L(
                  'En attente d’un autre joueur…',
                  'Waiting for another player…',
                  'Esperando a otro jugador…',
                )
              : L('Lancer la partie', 'Start the game', 'Empezar la partida')}
          </button>
        ) : (
          <p className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">
            {L(
              'En attente du lancement par l’hôte…',
              'Waiting for the host to start…',
              'Esperando a que el anfitrión empiece…',
            )}
          </p>
        )}
      </div>
    );
  }

  /* ---------- Question / correction ---------- */
  if ((room.phase === 'question' || room.phase === 'reveal') && room.question) {
    const isReveal = room.phase === 'reveal' && room.reveal;
    const answeredCount = room.players.filter((p) => p.answered).length;
    const progress = Math.min(100, (remaining / (room.seconds * 1000)) * 100);
    const mine = isReveal ? room.reveal!.results[String(me.id)] : null;
    const totalAnswers = isReveal
      ? Math.max(
          1,
          room.reveal!.counts.reduce((a, b) => a + b, 0),
        )
      : 1;

    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6 animate-in fade-in">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>
            {L('Question', 'Question', 'Pregunta')} {room.index + 1}/{room.total}
          </span>
          <span>
            {room.phase === 'question'
              ? `${Math.ceil(remaining / 1000)} s`
              : L('Correction', 'Answer', 'Corrección')}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(room.phase === 'question' ? progress : 0)}
        >
          <div
            className="h-full rounded-full bg-sky-600 transition-[width] duration-100"
            style={{ width: `${room.phase === 'question' ? progress : 0}%` }}
          />
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-xl">
          <h2 className="text-lg font-black leading-snug">{room.question.text[language]}</h2>
        </div>

        <div className="grid gap-2.5">
          {room.question.options.map((option, i) => {
            const style = OPTION_STYLES[i];
            const Icon = style.icon;
            const chosen = me.choice === i;
            const isCorrect = isReveal && room.reveal!.correct === i;
            const dim = isReveal ? !isCorrect : me.choice !== null && !chosen;
            return (
              <button
                key={i}
                disabled={room.phase !== 'question' || me.choice !== null}
                onClick={() => run(() => answerRoom(room.code, i))}
                className={`relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-white shadow-md transition-all ${style.bg} ${
                  dim ? 'opacity-40' : ''
                } ${chosen ? 'ring-4 ring-white/70' : ''} ${isCorrect ? 'ring-4 ring-emerald-300' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{option[language]}</span>
                {isCorrect && <Check className="h-5 w-5 shrink-0" aria-label="Correct" />}
                {isReveal && !isCorrect && chosen && (
                  <X className="h-5 w-5 shrink-0" aria-label="Wrong" />
                )}
                {isReveal && (
                  <span
                    className="absolute bottom-0 left-0 h-1 rounded-b-2xl bg-white/60"
                    style={{ width: `${(room.reveal!.counts[i] / totalAnswers) * 100}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {errorBox}

        {room.phase === 'question' ? (
          <p
            className="text-center text-xs font-bold text-slate-500 dark:text-slate-400"
            aria-live="polite"
          >
            {me.choice !== null
              ? L('Réponse envoyée !', 'Answer sent!', '¡Respuesta enviada!')
              : L('Choisissez vite !', 'Choose quickly!', '¡Elija rápido!')}{' '}
            {answeredCount}/{room.players.length}
          </p>
        ) : (
          <>
            <p
              className={`text-center text-sm font-black ${
                mine && mine.points > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
              aria-live="polite"
            >
              {mine && mine.points > 0
                ? `+${mine.points} pts`
                : mine && mine.choice === null
                  ? L('Pas de réponse', 'No answer', 'Sin respuesta')
                  : L('Raté', 'Missed', 'Fallaste')}
            </p>
            <Scoreboard players={playersSorted} meId={me.id} />
          </>
        )}
      </div>
    );
  }

  /* ---------- Fin de partie ---------- */
  const ranking = room.ranking || playersSorted;
  const rank = ranking.findIndex((p) => p.id === me.id) + 1;
  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-6 animate-in fade-in">
      {header}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center text-white shadow-xl">
        <Trophy className="mx-auto h-10 w-10 text-amber-400" aria-hidden="true" />
        <h1 className="mt-2 text-2xl font-black">
          {rank === 1
            ? L('Vous avez gagné !', 'You won!', '¡Ha ganado!')
            : L('Partie terminée', 'Game over', 'Partida terminada')}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {L(
            `Vous finissez n° ${rank}`,
            `You finished #${rank}`,
            `Termina en el puesto n.º ${rank}`,
          )}
        </p>
      </div>
      <Scoreboard players={ranking.map((p) => ({ ...p }))} meId={me.id} />
      {errorBox}
      {me.isHost ? (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">
            {L('Prochaine partie', 'Next game', 'Próxima partida')}
          </h2>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            {L('Nombre de questions', 'Number of questions', 'Número de preguntas')}
            <OptionPicker values={COUNT_CHOICES} value={nextCount} onChange={setNextCount} />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            {L('Temps par question', 'Time per question', 'Tiempo por pregunta')}
            <OptionPicker
              values={SECONDS_CHOICES}
              value={nextSeconds}
              onChange={setNextSeconds}
              format={(n) => `${n} s`}
            />
          </label>
          <button
            onClick={() =>
              run(() => restartRoom(room.code, { count: nextCount, seconds: nextSeconds }))
            }
            className={`${button} w-full bg-sky-700 text-white hover:bg-sky-600`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {L(
              'Rejouer avec le même code',
              'Play again with the same code',
              'Jugar con el mismo código',
            )}
          </button>
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            {L(
              'Mêmes joueurs, nouvelles questions : personne ne ressaisit le code.',
              'Same players, new questions: nobody has to retype the code.',
              'Mismos jugadores, preguntas nuevas: nadie tiene que volver a escribir el código.',
            )}
          </p>
        </div>
      ) : (
        <p className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          {L(
            'Restez ici : l’hôte peut relancer une partie avec le même code et vous la rejoindrez automatiquement.',
            'Stay here: the host can start a new game with the same code and you will join automatically.',
            'Quédate aquí: el anfitrión puede iniciar otra partida con el mismo código y entrarás automáticamente.',
          )}
        </p>
      )}
    </div>
  );
};

const COUNT_CHOICES = [5, 10, 15];
const SECONDS_CHOICES = [5, 10, 15, 20, 30];

const OptionPicker: React.FC<{
  values: number[];
  value: number;
  onChange: (n: number) => void;
  format?: (n: number) => string;
}> = ({ values, value, onChange, format = String }) => (
  <div className="mt-1.5 flex flex-wrap gap-2">
    {values.map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        aria-pressed={value === n}
        className={`min-w-[3.5rem] flex-1 rounded-xl border py-2 text-sm font-black ${
          value === n
            ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
            : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
        }`}
      >
        {format(n)}
      </button>
    ))}
  </div>
);

const Scoreboard: React.FC<{
  players: { id: number; name: string; score: number }[];
  meId: number;
}> = ({ players, meId }) => (
  <ol className="space-y-1.5 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
    {players.slice(0, 8).map((p, i) => (
      <li
        key={p.id}
        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
          p.id === meId
            ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100'
            : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="w-5 text-center text-xs text-slate-400">{i + 1}</span>
          {p.name}
        </span>
        <span className="tabular-nums">{p.score}</span>
      </li>
    ))}
  </ol>
);

export default RoomQuiz;
