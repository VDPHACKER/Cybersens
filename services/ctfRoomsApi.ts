import { api } from './apiClient';
import type { CTFChallenge, Language } from '../types';

/* CTF en équipe : appels API + flux temps réel (Server-Sent Events). Les drapeaux restent sur le serveur. */

export type CtfRoomPhase = 'lobby' | 'playing' | 'finished';

/** Défi tel que le voient les joueurs : jamais de drapeau. */
export type PublicChallenge = Omit<CTFChallenge, 'flag'>;

export interface CtfRoomState {
  code: string;
  phase: CtfRoomPhase;
  /** Numéro de la partie dans cette salle (1 à la création, +1 à chaque « Rejouer »). */
  session: number;
  hostId: number;
  now: number;
  startedAt: number | null;
  finishedAt: number | null;
  challenges: PublicChallenge[];
  solved: Record<string, { byId: number; by: string; at: number }>;
  teamScore: number;
  totalPoints: number;
  players: { id: number; name: string; score: number; solves: number; connected: boolean }[];
  you: { id: number; isHost: boolean };
}

/** Le serveur génère lui-même les défis (et garde les drapeaux) : on lui envoie seulement les identifiants. */
export const createCtfRoom = (challengeIds: string[], lang: Language) =>
  api<{ code: string }>('POST', '/api/ctf/rooms', { challengeIds, lang });

export const joinCtfRoom = (code: string) =>
  api<{ code: string }>('POST', '/api/ctf/rooms/join', { code });

export const startCtfRoom = (code: string) => api('POST', '/api/ctf/rooms/start', { code });

export const finishCtfRoom = (code: string) => api('POST', '/api/ctf/rooms/finish', { code });

/** Nouvelle partie dans la même salle (hôte, partie terminée) : mêmes défis, régénérés par le serveur. */
export const restartCtfRoom = (code: string, lang: Language) =>
  api('POST', '/api/ctf/rooms/restart', { code, lang });

export const submitCtfFlag = (code: string, challengeId: string, flag: string) =>
  api<{ ok: boolean; points?: number; finished?: boolean }>('POST', '/api/ctf/rooms/submit', {
    code,
    challengeId,
    flag,
  });

export const askCtfSandbox = (code: string, challengeId: string, prompt: string, lang: Language) =>
  api<{ reply: string }>('POST', '/api/ctf/rooms/sandbox', { code, challengeId, prompt, lang });

export const leaveCtfRoom = () => api('POST', '/api/ctf/rooms/leave');

/**
 * Ouvre le flux d'une salle. `onClosed` est appelé quand le serveur refuse définitivement la connexion
 * (salle supprimée, joueur retiré) ; les coupures réseau sont rétablies automatiquement par le navigateur.
 */
export const watchCtfRoom = (
  code: string,
  onState: (state: CtfRoomState) => void,
  onClosed: () => void,
) => {
  const source = new EventSource(`/api/ctf/rooms/stream?code=${encodeURIComponent(code)}`);
  source.addEventListener('state', (event) => {
    try {
      onState(JSON.parse((event as MessageEvent<string>).data) as CtfRoomState);
    } catch {
      /* message illisible : ignoré */
    }
  });
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) onClosed();
  };
  return () => source.close();
};
