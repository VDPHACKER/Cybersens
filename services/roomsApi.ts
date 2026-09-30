import { api } from './apiClient';

/* Quiz multijoueur en salles : appels API + flux temps réel (Server-Sent Events). */

export type RoomPhase = 'lobby' | 'question' | 'reveal' | 'finished';

export type LocalizedText = Record<'fr' | 'en' | 'es', string>;

export interface RoomState {
  code: string;
  phase: RoomPhase;
  hostId: number;
  total: number;
  seconds: number;
  index: number;
  now: number;
  deadline?: number;
  players: { id: number; name: string; score: number; answered: boolean; connected: boolean }[];
  you: { id: number; isHost: boolean; choice: number | null };
  question?: { text: LocalizedText; options: LocalizedText[] };
  reveal?: {
    correct: number;
    counts: number[];
    results: Record<string, { choice: number | null; points: number }>;
  };
  ranking?: { id: number; name: string; score: number }[];
}

export const createRoom = (input: { count: number; seconds: number }) =>
  api<{ code: string }>('POST', '/api/rooms', input);

export const joinRoom = (code: string) =>
  api<{ code: string }>('POST', '/api/rooms/join', { code });

export const startRoom = (code: string) => api('POST', '/api/rooms/start', { code });

export const answerRoom = (code: string, choice: number) =>
  api('POST', '/api/rooms/answer', { code, choice });

export const leaveRoom = () => api('POST', '/api/rooms/leave');

/**
 * Ouvre le flux d'une salle. `onClosed` est appelé quand le serveur refuse définitivement la connexion
 * (salle supprimée, joueur retiré) ; les coupures réseau sont rétablies automatiquement par le navigateur.
 */
export const watchRoom = (
  code: string,
  onState: (state: RoomState) => void,
  onClosed: () => void,
) => {
  const source = new EventSource(`/api/rooms/stream?code=${encodeURIComponent(code)}`);
  source.addEventListener('state', (event) => {
    try {
      onState(JSON.parse((event as MessageEvent<string>).data) as RoomState);
    } catch {
      /* message illisible : ignoré */
    }
  });
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) onClosed();
  };
  return () => source.close();
};
