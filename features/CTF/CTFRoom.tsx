import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  Flag,
  Lightbulb,
  Loader2,
  Play,
  Terminal,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { useL } from '../../components/ui';
import { useI18n } from '../../services/i18n';
import { audioService } from '../../services/audioService';
import type { CTFChallenge, Language } from '../../types';
import {
  askCtfSandbox,
  createCtfRoom,
  finishCtfRoom,
  joinCtfRoom,
  leaveCtfRoom,
  restartCtfRoom,
  startCtfRoom,
  submitCtfFlag,
  watchCtfRoom,
  type CtfRoomState,
  type PublicChallenge,
} from '../../services/ctfRoomsApi';
import { CHALLENGE_FACTORIES } from './ctfGenerator';

/*
 * CTF en équipe : un joueur crée la salle en choisissant les défis, partage le code à 6 chiffres, puis tout le
 * monde résout ensemble la même liste. Un défi résolu par un joueur l'est pour l'équipe ; le serveur garde les
 * drapeaux et vérifie chaque soumission.
 */

interface CTFRoomProps {
  onBack: () => void;
  initialCode?: string;
}

type Feedback = { type: 'success' | 'error'; message: string };
type ChatLine = { role: 'user' | 'bot'; text: string };

const MAX_CHALLENGES = 12;
const DEFAULT_SELECTION = 6;

const button =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
const panel = 'rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl';

const buildPool = (lang: Language): CTFChallenge[] =>
  Object.values(CHALLENGE_FACTORIES).map((factory) => factory(lang));

const difficultyStyle = (difficulty: string) =>
  difficulty === 'Facile'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : difficulty === 'Moyen'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-red-500/10 text-red-400 border-red-500/20';

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  return `${String(m).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const CTFRoom: React.FC<CTFRoomProps> = ({ onBack, initialCode }) => {
  const L = useL();
  const { language } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<CtfRoomState | null>(null);
  const [joinCode, setJoinCode] = useState(initialCode || '');
  // Liste affichée pour choisir : les défis réels sont générés par le serveur à la création de la salle
  const [pool] = useState<CTFChallenge[]>(() => buildPool(language));
  const [selected, setSelected] = useState<string[]>(() =>
    Object.keys(CHALLENGE_FACTORIES)
      .sort(() => Math.random() - 0.5)
      .slice(0, DEFAULT_SELECTION),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const offset = useRef(0); // décalage entre l'horloge du serveur et celle de l'appareil
  const knownSolved = useRef<Set<string> | null>(null);

  // États par défi, conservés quand on change de défi
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [hints, setHints] = useState<Record<string, number[]>>({});
  const [chats, setChats] = useState<Record<string, ChatLine[]>>({});
  const [prompt, setPrompt] = useState('');
  const [thinking, setThinking] = useState(false);

  const messageOf = (err: unknown) =>
    err instanceof Error
      ? err.message
      : L('Erreur inattendue.', 'Unexpected error.', 'Error inesperado.');

  const notify = useCallback((message: string, type: 'info' | 'success' = 'info') => {
    window.dispatchEvent(new CustomEvent('cyber-notify', { detail: { message, type } }));
  }, []);

  // Flux temps réel de la salle
  useEffect(() => {
    if (!code) return;
    return watchCtfRoom(
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

  // Nouvelle partie : on repart de zéro (défi actif, saisies, messages)
  useEffect(() => {
    if (!room) return;
    setActiveId(room.challenges[0]?.id ?? '');
    setFlagInputs({});
    setFeedback({});
    setHints({});
    setChats({});
    knownSolved.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.session, room?.code]);

  // Prévient quand un coéquipier valide un défi (le premier état reçu sert de point de départ)
  useEffect(() => {
    if (!room) return;
    const ids = new Set(Object.keys(room.solved));
    if (knownSolved.current) {
      for (const id of ids) {
        const info = room.solved[id];
        if (knownSolved.current.has(id) || info.byId === room.you.id) continue;
        const title = room.challenges.find((c) => c.id === id)?.title ?? id;
        notify(
          L(
            `${info.by} a validé « ${title} » pour l’équipe !`,
            `${info.by} solved “${title}” for the team!`,
            `¡${info.by} resolvió «${title}» para el equipo!`,
          ),
          'success',
        );
        audioService.playSuccess();
      }
    }
    knownSolved.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.solved]);

  // Chronomètre de la partie
  useEffect(() => {
    if (room?.phase === 'finished' && room.startedAt && room.finishedAt) {
      setElapsed(room.finishedAt - room.startedAt);
      return;
    }
    if (room?.phase !== 'playing' || !room.startedAt) return;
    const startedAt = room.startedAt;
    const tick = () => setElapsed(Date.now() + offset.current - startedAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [room?.phase, room?.startedAt, room?.finishedAt]);

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

  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(messageOf(err));
    }
  };

  const leave = async () => {
    setCode(null);
    setRoom(null);
    try {
      await leaveCtfRoom();
    } catch {
      /* la salle expirera d'elle-même */
    }
  };

  const shareLink = code ? `${window.location.origin}/?joinctf=${code}` : '';
  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'CyberSens CTF',
          text: L(
            `Rejoins mon équipe CTF CyberSens avec le code ${code}`,
            `Join my CyberSens CTF team with code ${code}`,
            `Únete a mi equipo CTF de CyberSens con el código ${code}`,
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

  const toggleChallenge = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_CHALLENGES
          ? prev
          : [...prev, id],
    );

  // Le serveur génère les défis et garde les drapeaux : on ne lui envoie que les identifiants choisis
  const create = () => enter(() => createCtfRoom(selected, language));

  // Nouvelle partie : mêmes défis, drapeaux et données régénérés par le serveur
  const replay = () => run(() => restartCtfRoom(room?.code ?? '', language));

  const submitFlag = async (challenge: PublicChallenge) => {
    const flag = (flagInputs[challenge.id] || '').trim();
    const setMsg = (f: Feedback) => setFeedback((prev) => ({ ...prev, [challenge.id]: f }));
    if (!flag)
      return setMsg({
        type: 'error',
        message: L(
          'Veuillez saisir un drapeau avant de valider.',
          'Please enter a flag before submitting.',
          'Ingresa una bandera antes de validar.',
        ),
      });
    try {
      const result = await submitCtfFlag(room?.code ?? '', challenge.id, flag);
      if (result.ok) {
        audioService.playSuccess();
        setMsg({
          type: 'success',
          message: L(
            `DRAPEAU VALIDÉ ! +${result.points} points pour l’équipe.`,
            `FLAG ACCEPTED! +${result.points} points for the team.`,
            `¡BANDERA ACEPTADA! +${result.points} puntos para el equipo.`,
          ),
        });
      } else {
        audioService.playError();
        setMsg({
          type: 'error',
          message: L(
            'Drapeau incorrect. Inspectez attentivement les données ou utilisez les indices.',
            'Incorrect flag. Carefully inspect the data or use the hints.',
            'Bandera incorrecta. Revisa los datos o consulta las pistas.',
          ),
        });
      }
    } catch (err) {
      setMsg({ type: 'error', message: messageOf(err) });
    }
  };

  const sendPrompt = async (challenge: PublicChallenge) => {
    const text = prompt.trim();
    if (!text || thinking) return;
    setPrompt('');
    setThinking(true);
    const add = (line: ChatLine) =>
      setChats((prev) => ({ ...prev, [challenge.id]: [...(prev[challenge.id] ?? []), line] }));
    add({ role: 'user', text });
    try {
      const { reply } = await askCtfSandbox(room?.code ?? '', challenge.id, text, language);
      add({ role: 'bot', text: reply });
    } catch (err) {
      add({ role: 'bot', text: messageOf(err) });
    } finally {
      setThinking(false);
    }
  };

  const header = (
    <button
      onClick={code ? leave : onBack}
      className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {code
        ? L('Quitter la salle', 'Leave the room', 'Salir de la sala')
        : L('Retour à l’Arène solo', 'Back to the solo Arena', 'Volver a la Arena en solitario')}
    </button>
  );

  const errorBox = error && (
    <div
      role="alert"
      className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200"
    >
      {error}
    </div>
  );

  if (code && !room) {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        {header}
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  /* ---------- Menu : créer ou rejoindre ---------- */
  if (!code || !room) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-white animate-in fade-in">
        {header}
        <div>
          <h1 className="text-2xl font-extrabold">
            {L('CTF en équipe', 'Team CTF', 'CTF en equipo')}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {L(
              'Résolvez les défis à plusieurs : un défi validé par un joueur l’est pour toute l’équipe. Créez une salle et partagez le code, ou rejoignez celle d’un ami.',
              'Solve challenges together: a challenge solved by one player counts for the whole team. Create a room and share the code, or join a friend’s room.',
              'Resuelvan los retos juntos: un reto resuelto por un jugador cuenta para todo el equipo. Crea una sala y comparte el código, o únete a la de un amigo.',
            )}
          </p>
        </div>
        {errorBox}

        <div className={`${panel} space-y-3`}>
          <h2 className="text-sm font-black">
            {L('Rejoindre une salle', 'Join a room', 'Unirse a una sala')}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enter(() => joinCtfRoom(joinCode.trim()));
            }}
            className="flex gap-2"
          >
            <input
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              aria-label={L('Code de la salle', 'Room code', 'Código de la sala')}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-xl font-black tracking-[0.3em] outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={busy || joinCode.length !== 6}
              className={`${button} bg-cyan-700 text-white hover:bg-cyan-600`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {L('Rejoindre', 'Join', 'Unirse')}
            </button>
          </form>
        </div>

        <div className={`${panel} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black">
              {L('Créer une salle', 'Create a room', 'Crear una sala')}
            </h2>
            <span className="text-xs font-bold text-cyan-300">
              {selected.length} / {MAX_CHALLENGES}{' '}
              {L('défis choisis', 'challenges chosen', 'retos elegidos')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {L(
              'Choisissez les défis que l’équipe devra résoudre. Le serveur les génère au moment de la création, dans votre langue : les données et les drapeaux sont tirés au sort et personne, vous compris, ne peut les connaître à l’avance.',
              'Choose the challenges the team must solve. The server generates them when the room is created, in your language: data and flags are drawn at random and nobody, including you, can know them in advance.',
              'Elige los retos que el equipo debe resolver. El servidor los genera al crear la sala, en tu idioma: los datos y las banderas se sortean y nadie, tú incluido, puede conocerlos de antemano.',
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelected(pool.slice(0, MAX_CHALLENGES).map((c) => c.id))}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              {L('Les 12 premiers', 'First 12', 'Los 12 primeros')}
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              {L('Aucun', 'None', 'Ninguno')}
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pool.map((c) => {
              const on = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-xs transition-colors ${
                      on
                        ? 'border-cyan-500/70 bg-slate-900'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleChallenge(c.id)}
                      className="mt-0.5 h-4 w-4 accent-cyan-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-bold text-white">{c.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                        <span
                          className={`rounded border px-1.5 py-0.5 font-bold ${difficultyStyle(c.difficulty)}`}
                        >
                          {c.difficulty}
                        </span>
                        <span>{c.category}</span>
                        <span className="font-bold text-cyan-300">{c.points} pts</span>
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            onClick={create}
            disabled={busy || selected.length === 0}
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
  const playersSorted = [...room.players].sort((a, b) => b.score - a.score || b.solves - a.solves);
  const solvedCount = Object.keys(room.solved).length;
  const percent = room.totalPoints ? Math.round((room.teamScore / room.totalPoints) * 100) : 0;

  const challengeList = (
    <ul className="space-y-2">
      {room.challenges.map((c) => {
        const info = room.solved[c.id];
        const isActive = c.id === activeId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => room.phase === 'playing' && setActiveId(c.id)}
              disabled={room.phase !== 'playing'}
              className={`w-full rounded-2xl border p-3 text-left text-xs transition-all ${
                isActive && room.phase === 'playing'
                  ? 'border-cyan-500/80 bg-slate-900 ring-1 ring-cyan-500/40'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              } disabled:cursor-default`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0 break-words font-bold text-white">{c.title}</span>
                {info ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="OK" />
                ) : (
                  <span className="shrink-0 font-black text-cyan-300">{c.points}</span>
                )}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                <span
                  className={`rounded border px-1.5 py-0.5 font-bold ${difficultyStyle(c.difficulty)}`}
                >
                  {c.difficulty}
                </span>
                <span>{c.category}</span>
              </span>
              {info && (
                <span className="mt-1.5 block text-[11px] font-semibold text-emerald-300">
                  {L(`Résolu par ${info.by}`, `Solved by ${info.by}`, `Resuelto por ${info.by}`)} ·
                  +{c.points}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  /* ---------- Salle d'attente ---------- */
  if (room.phase === 'lobby') {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-white animate-in fade-in">
        {header}
        {errorBox}
        <div className="rounded-3xl border border-cyan-900/50 bg-slate-900 p-6 text-center shadow-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            {L('Code de la salle', 'Room code', 'Código de la sala')}
          </p>
          <p className="mt-2 text-5xl font-black tracking-[0.25em]" aria-live="polite">
            {room.code}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {L(
              'Sur un autre appareil : CTF, En équipe, puis ce code.',
              'On another device: CTF, Team, then this code.',
              'En otro dispositivo: CTF, En equipo y este código.',
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

        <div className="grid gap-5 md:grid-cols-2">
          <div className={panel}>
            <h2 className="mb-3 flex items-center justify-between text-sm font-black">
              <span>{L('Équipe', 'Team', 'Equipo')}</span>
              <span className="text-xs font-bold text-slate-400">{room.players.length}</span>
            </h2>
            <ul className="space-y-2">
              {room.players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${p.connected ? 'bg-emerald-500' : 'bg-slate-500'}`}
                      aria-hidden="true"
                    />
                    {p.name}
                    {p.id === room.hostId && (
                      <Crown className="h-4 w-4 text-amber-400" aria-label="Host" />
                    )}
                  </span>
                  {p.id === me.id && (
                    <span className="text-[10px] uppercase text-cyan-400">
                      {L('Vous', 'You', 'Tú')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className={panel}>
            <h2 className="mb-3 flex items-center justify-between text-sm font-black">
              <span>{L('Défis à résoudre', 'Challenges to solve', 'Retos a resolver')}</span>
              <span className="text-xs font-bold text-slate-400">
                {room.challenges.length} · {room.totalPoints} pts
              </span>
            </h2>
            {challengeList}
          </div>
        </div>

        {me.isHost ? (
          <button
            onClick={() => run(() => startCtfRoom(room.code))}
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
          <p className="text-center text-xs font-bold text-slate-400">
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

  /* ---------- Fin de partie ---------- */
  if (room.phase === 'finished') {
    const allSolved = solvedCount === room.challenges.length;
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 text-white animate-in fade-in">
        {header}
        {errorBox}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
          <Trophy className="mx-auto h-10 w-10 text-amber-400" aria-hidden="true" />
          <h1 className="mt-2 text-2xl font-black">
            {allSolved
              ? L('Mission accomplie !', 'Mission accomplished!', '¡Misión cumplida!')
              : L('Partie terminée', 'Game over', 'Partida terminada')}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {L(
              `${solvedCount} défi(s) sur ${room.challenges.length} • ${room.teamScore} / ${room.totalPoints} pts • ${clock(elapsed)}`,
              `${solvedCount} of ${room.challenges.length} challenge(s) • ${room.teamScore} / ${room.totalPoints} pts • ${clock(elapsed)}`,
              `${solvedCount} de ${room.challenges.length} reto(s) • ${room.teamScore} / ${room.totalPoints} pts • ${clock(elapsed)}`,
            )}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className={panel}>
            <h2 className="mb-3 text-sm font-black">
              {L(
                'Contribution de chacun',
                'Each player’s contribution',
                'Contribución de cada uno',
              )}
            </h2>
            <ol className="space-y-1.5">
              {playersSorted.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
                    p.id === me.id ? 'bg-cyan-950/50 text-cyan-100' : 'text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs text-slate-500">{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="tabular-nums">
                    {p.score} pts · {p.solves}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className={panel}>
            <h2 className="mb-3 text-sm font-black">{L('Défis', 'Challenges', 'Retos')}</h2>
            {challengeList}
          </div>
        </div>

        {me.isHost ? (
          <div className={`${panel} space-y-3`}>
            <button
              onClick={replay}
              className={`${button} w-full bg-cyan-700 text-white hover:bg-cyan-600`}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {L(
                'Rejouer avec le même code',
                'Play again with the same code',
                'Jugar con el mismo código',
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              {L(
                'Mêmes défis, nouveaux drapeaux et nouvelles données. Personne ne ressaisit le code.',
                'Same challenges, new flags and new data. Nobody has to retype the code.',
                'Mismos retos, banderas y datos nuevos. Nadie tiene que volver a escribir el código.',
              )}
            </p>
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-slate-400">
            {L(
              'Restez ici : l’hôte peut relancer une partie avec le même code et vous la rejoindrez automatiquement.',
              'Stay here: the host can start a new game with the same code and you will join automatically.',
              'Quédate aquí: el anfitrión puede iniciar otra partida con el mismo código y entrarás automáticamente.',
            )}
          </p>
        )}
      </div>
    );
  }

  /* ---------- Partie en cours ---------- */
  const active = room.challenges.find((c) => c.id === activeId) ?? room.challenges[0];
  const activeSolved = active ? room.solved[active.id] : undefined;
  const revealed = (active && hints[active.id]) || [];
  const chat = (active && chats[active.id]) || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 text-white animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {header}
        <span className="rounded-xl border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
          {L('Salle', 'Room', 'Sala')} {room.code}
        </span>
      </div>
      {errorBox}

      <div className={`${panel} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-400">{room.teamScore}</span>
            <span className="text-xs text-slate-400">
              / {room.totalPoints} pts · {solvedCount} / {room.challenges.length}{' '}
              {L('validés', 'solved', 'resueltos')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-black tabular-nums" aria-label="Timer">
              {clock(elapsed)}
            </span>
            {me.isHost && (
              <button
                onClick={() => run(() => finishCtfRoom(room.code))}
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                {L('Terminer la partie', 'End the game', 'Terminar la partida')}
              </button>
            )}
          </div>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ul className="flex flex-wrap gap-2">
          {playersSorted.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                p.id === me.id ? 'bg-cyan-950/60 text-cyan-100' : 'bg-slate-800 text-slate-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${p.connected ? 'bg-emerald-500' : 'bg-slate-500'}`}
                aria-hidden="true"
              />
              {p.name}
              {p.id === room.hostId && (
                <Crown className="h-3 w-3 text-amber-400" aria-label="Host" />
              )}
              <span className="text-cyan-300">{p.score}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4">{challengeList}</div>

        {active && (
          <div className="min-w-0 space-y-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl lg:col-span-8">
            <div className="space-y-1 border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="uppercase tracking-wider text-cyan-400">{active.category}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{active.difficulty}</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-300">{active.points} pts</span>
              </div>
              <h3 className="break-words text-2xl font-black">{active.title}</h3>
              {activeSolved && (
                <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {L(
                    `Déjà résolu par ${activeSolved.by} : un autre défi vous attend !`,
                    `Already solved by ${activeSolved.by}: pick another challenge!`,
                    `Ya resuelto por ${activeSolved.by}: ¡elige otro reto!`,
                  )}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {L('Mission / Scénario', 'Mission / Scenario', 'Misión / Escenario')}
              </h4>
              <p className="break-words text-sm leading-relaxed text-slate-200">
                {active.description}
              </p>
              <div className="break-words rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs font-medium text-cyan-300">
                <Lightbulb
                  className="-mt-0.5 mr-1.5 inline-block h-4 w-4 text-amber-400"
                  aria-hidden="true"
                />
                <strong className="text-white">{L('Contexte :', 'Context:', 'Contexto:')}</strong>{' '}
                {active.scenario}
              </div>
            </div>

            {active.targetData && active.interactiveType !== 'interactive_llm' && (
              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  {L('Données cibles', 'Target data', 'Datos objetivo')}
                </span>
                <div className="whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 shadow-inner">
                  {active.targetData}
                </div>
              </div>
            )}

            {active.interactiveType === 'interactive_llm' && (
              <div className="space-y-3 rounded-2xl border border-cyan-500/30 bg-slate-950 p-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-cyan-400">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  {L(
                    'Sandbox : Agent Gardien du Secret',
                    'Sandbox: Secret Guardian Agent',
                    'Sandbox: Agente Guardián del Secreto',
                  )}
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1 font-mono text-xs">
                  {chat.length === 0 && (
                    <p className="text-slate-500">
                      {L(
                        'Écrivez une invite pour tenter de contourner le garde-fou.',
                        'Write a prompt to try to bypass the guardrail.',
                        'Escribe una instrucción para intentar eludir la protección.',
                      )}
                    </p>
                  )}
                  {chat.map((line, i) => (
                    <p
                      key={i}
                      className={`whitespace-pre-wrap break-words rounded-xl border p-2.5 leading-relaxed ${
                        line.role === 'user'
                          ? 'ml-6 border-cyan-500/30 bg-cyan-900/30 text-cyan-200'
                          : 'mr-6 border-slate-800 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {line.text}
                    </p>
                  ))}
                  {thinking && <p className="animate-pulse pl-2 text-cyan-400">…</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void sendPrompt(active)}
                    maxLength={500}
                    placeholder={L('Votre invite…', 'Your prompt…', 'Tu instrucción…')}
                    className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => void sendPrompt(active)}
                    disabled={thinking || !prompt.trim()}
                    className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-bold hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {L('Injecter', 'Inject', 'Inyectar')}
                  </button>
                </div>
              </div>
            )}

            {(active.hints?.length ?? 0) > 0 && (
              <div className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {L('Indices pédagogiques', 'Pedagogical hints', 'Pistas pedagógicas')}
                </h4>
                {active.hints.map((hint, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 text-xs"
                  >
                    {revealed.includes(i) ? (
                      <p className="break-words font-medium leading-relaxed text-amber-300">
                        <strong>
                          {L('Indice', 'Hint', 'Pista')} {i + 1} :
                        </strong>{' '}
                        {hint}
                      </p>
                    ) : (
                      <button
                        onClick={() =>
                          setHints((prev) => ({ ...prev, [active.id]: [...revealed, i] }))
                        }
                        className="flex items-center gap-1.5 font-medium text-slate-400 hover:text-amber-400"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {L('Dévoiler l’indice', 'Reveal hint', 'Mostrar pista')} {i + 1}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <Flag className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                {L(
                  'Soumettre le drapeau trouvé',
                  'Submit the flag you found',
                  'Enviar la bandera encontrada',
                )}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={flagInputs[active.id] || ''}
                  onChange={(e) => setFlagInputs({ ...flagInputs, [active.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && void submitFlag(active)}
                  disabled={!!activeSolved}
                  maxLength={300}
                  placeholder="FLAG{...}"
                  className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 font-mono text-sm text-cyan-300 outline-none placeholder:text-slate-600 focus:border-cyan-500 disabled:opacity-50"
                />
                <button
                  onClick={() => void submitFlag(active)}
                  disabled={!!activeSolved}
                  className="rounded-xl bg-cyan-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-cyan-600 disabled:opacity-50"
                >
                  {L('Valider', 'Submit', 'Validar')}
                </button>
              </div>
              {feedback[active.id] && (
                <p
                  role="status"
                  className={`flex items-center gap-2 break-words rounded-xl border p-3 text-xs font-semibold ${
                    feedback[active.id].type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/40 bg-red-500/10 text-red-300'
                  }`}
                >
                  {feedback[active.id].type === 'success' ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                  )}
                  {feedback[active.id].message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CTFRoom;
