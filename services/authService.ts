import { UserPreferences } from '../types';
import { api, ApiError, ServerSnapshot, flushSyncQueue, getPendingSyncCount } from './apiClient';
import {
  applyServerSnapshot,
  clearUserCache,
  collectLocalDataForMigration,
  getCacheOwner,
  getPreferences,
} from './persistenceService';

/*
 * Authentification serveur : le mot de passe est vérifié et haché (scrypt) par le serveur,
 * la session est un cookie HttpOnly inaccessible au JavaScript.
 * Les anciens comptes créés dans le navigateur (version sans base de données) sont migrés
 * automatiquement à la première connexion.
 */

export const MIN_PASSWORD_LENGTH = 12;
export type AccountRole = NonNullable<UserPreferences['role']>;

export const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length <= 254;

/** Retourne un message d'erreur, ou null si le mot de passe est acceptable (mêmes règles que le serveur). */
export const validatePassword = (
  password: string,
  context: { name?: string; email?: string } = {},
) => {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (password.length > 128) return 'Le mot de passe ne doit pas dépasser 128 caractères.';
  const lower = password.toLowerCase();
  const emailUser = context.email?.split('@')[0]?.toLowerCase();
  if (emailUser && emailUser.length >= 3 && lower.includes(emailUser))
    return 'Le mot de passe ne doit pas contenir votre adresse e-mail.';
  const firstName = context.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstName && firstName.length >= 3 && lower.includes(firstName))
    return 'Le mot de passe ne doit pas contenir votre nom.';
  return null;
};

/* --- Comptes locaux de l'ancienne version (lecture seule, pour migration) --- */
const LEGACY_ACCOUNTS_KEY = 'cybersens_accounts';
const LEGACY_LOCKOUT_KEY = 'cybersens_login_lockout';

interface LegacyAccount {
  name: string;
  email: string;
  role: AccountRole;
  salt: string;
  hash: string;
  iterations: number;
}

const readLegacyAccounts = (): LegacyAccount[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_ACCOUNTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const removeLegacyAccount = (email: string) => {
  const rest = readLegacyAccounts().filter((a) => a.email !== email);
  if (rest.length) localStorage.setItem(LEGACY_ACCOUNTS_KEY, JSON.stringify(rest));
  else localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
  localStorage.removeItem(LEGACY_LOCKOUT_KEY);
};

const verifyLegacyPassword = async (account: LegacyAccount, password: string) => {
  if (!window.crypto?.subtle) return false;
  const salt = new Uint8Array((account.salt.match(/.{2}/g) || []).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: account.iterations },
    key,
    256,
  );
  const hex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  let diff = hex.length ^ account.hash.length;
  for (let i = 0; i < Math.min(hex.length, account.hash.length); i++)
    diff |= hex.charCodeAt(i) ^ account.hash.charCodeAt(i);
  return diff === 0;
};

/* --- Session --- */

/**
 * Après une connexion réussie : migration des données locales (une seule fois par compte),
 * protection contre le mélange des données de deux comptes sur le même appareil, puis chargement du cache.
 */
const finishLogin = async (snap: ServerSnapshot): Promise<UserPreferences> => {
  const owner = getCacheOwner();
  if (owner !== null && owner !== snap.user.id) {
    clearUserCache(); // données d'un autre compte : jamais transmises ni affichées
  } else if (owner === null && !snap.user.migrated) {
    const local = collectLocalDataForMigration();
    if (local.hasData) {
      try {
        snap = await api<ServerSnapshot>('POST', '/api/migrate', local.payload);
      } catch (err) {
        console.warn('Migration des données locales impossible :', err);
      }
    }
  }
  removeLegacyAccount(snap.user.email);
  return applyServerSnapshot(snap);
};

export const registerAccount = async (input: {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  acceptTerms: boolean;
}) => finishLogin(await api<ServerSnapshot>('POST', '/api/auth/register', input));

export const loginAccount = async (email: string, password: string) => {
  try {
    return await finishLogin(
      await api<ServerSnapshot>('POST', '/api/auth/login', { email, password }),
    );
  } catch (err) {
    // Compte créé avec l'ancienne version (stocké dans ce navigateur) : on le recrée sur le serveur
    const legacy = readLegacyAccounts().find((a) => a.email === email.trim().toLowerCase());
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      legacy &&
      (await verifyLegacyPassword(legacy, password))
    ) {
      return finishLogin(
        await api<ServerSnapshot>('POST', '/api/auth/register', {
          name: legacy.name,
          email: legacy.email,
          password,
          role: legacy.role,
          legacyMigration: true,
        }),
      );
    }
    throw err;
  }
};

/**
 * Restaure la session existante (cookie) au chargement de l'application. Retourne null si non connecté.
 * Hors ligne, un utilisateur déjà connecté sur cet appareil retrouve ses données en cache (offline: true).
 */
export const restoreSession = async (): Promise<{
  prefs: UserPreferences;
  offline: boolean;
} | null> => {
  try {
    // Les modifications faites hors ligne partent d'abord, sinon le rechargement depuis le serveur les masquerait
    if (getPendingSyncCount() > 0) await flushSyncQueue();
    const snap = await api<ServerSnapshot>('GET', '/api/me');
    if (getCacheOwner() !== snap.user.id) clearUserCache();
    return { prefs: applyServerSnapshot(snap), offline: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      if (getCacheOwner() !== null) clearUserCache(); // session expirée : on ne laisse pas de données visibles
      return null;
    }
    if (err instanceof ApiError && err.status === 0) {
      const cached = getPreferences();
      if (cached.isAuthenticated && getCacheOwner() !== null)
        return { prefs: cached, offline: true };
    }
    throw err;
  }
};

/* --- Google, mot de passe oublié --- */

export interface AuthConfig {
  googleClientId: string | null;
  passwordReset: boolean;
  termsVersion?: string;
  contactEmail?: string | null;
}

export const getAuthConfig = async (): Promise<AuthConfig> => {
  try {
    return await api<AuthConfig>('GET', '/api/auth/config');
  } catch {
    return { googleClientId: null, passwordReset: false };
  }
};

export const loginWithGoogle = async (credential: string, role: AccountRole, acceptTerms = false) =>
  finishLogin(
    await api<ServerSnapshot>('POST', '/api/auth/google', { credential, role, acceptTerms }),
  );

export const requestPasswordReset = (email: string, lang: string) =>
  api('POST', '/api/auth/forgot', { email, lang });

export const resetPassword = (token: string, password: string) =>
  api('POST', '/api/auth/reset', { token, password });
