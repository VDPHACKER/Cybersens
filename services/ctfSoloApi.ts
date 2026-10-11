import { api } from './apiClient';
import type { CTFChallenge } from '../types';

// Arène CTF solo d'un membre connecté : défis et drapeaux sont générés et vérifiés par le serveur.

export type SoloChallenge = Omit<CTFChallenge, 'flag'>;

export interface SoloState {
  lang: string;
  challenges: SoloChallenge[];
  solved: Record<string, { points: number }>;
  attempts: Record<string, { left: number; lockedUntil: number | null }>;
  maxAttempts: number;
}

export interface SoloSubmitResult {
  ok: boolean;
  points?: number;
  firstTime?: boolean;
  attemptsLeft?: number;
  lockedUntil?: number | null;
}

export const fetchSoloState = (lang: string) =>
  api<SoloState>('GET', `/api/ctf/solo?lang=${encodeURIComponent(lang)}`);

export const submitSoloFlag = (challengeId: string, flag: string, lang: string) =>
  api<SoloSubmitResult>('POST', '/api/ctf/solo/submit', { challengeId, flag, lang });

export const regenerateSolo = (lang: string, challengeId?: string) =>
  api<SoloState>('POST', '/api/ctf/solo/regenerate', { challengeId, lang });

export const askSoloSandbox = (challengeId: string, prompt: string, lang: string) =>
  api<{ reply: string }>('POST', '/api/ctf/solo/sandbox', { challengeId, prompt, lang });
