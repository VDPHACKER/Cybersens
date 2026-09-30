// Client HTTP de l'API CyberSens (même origine, cookie de session HttpOnly envoyé automatiquement).
import { localizeServerError } from './serverErrors';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const SESSION_EXPIRED_EVENT = 'cybersens-session-expired';

export const api = async <T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, localizeServerError('Serveur injoignable. Vérifiez votre connexion.'));
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // réponse sans corps JSON
  }

  if (!res.ok) {
    // Session expirée pendant l'utilisation : l'application revient à l'écran de connexion
    if (res.status === 401 && !path.startsWith('/api/auth/'))
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    throw new ApiError(
      res.status,
      localizeServerError(
        typeof data?.error === 'string' ? data.error : 'Une erreur est survenue.',
      ),
    );
  }
  return data as T;
};

/* --- File de synchronisation hors ligne ---
 * Une écriture qui échoue faute de réseau est conservée puis rejouée dans l'ordre au retour de la connexion.
 * La file appartient à l'utilisateur connecté : elle est effacée à la déconnexion (voir persistenceService).
 */
type WriteMethod = 'POST' | 'PATCH' | 'DELETE';
interface QueuedWrite {
  method: WriteMethod;
  path: string;
  body?: unknown;
}

export const SYNC_QUEUE_KEY = 'cybersens_sync_queue';
export const SYNC_QUEUE_EVENT = 'cybersens-sync-queue-changed';
const MAX_QUEUE = 300;

const readQueue = (): QueuedWrite[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedWrite[]) => {
  try {
    if (queue.length) localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
    else localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch {
    // stockage plein : la modification restera seulement locale
  }
  window.dispatchEvent(new CustomEvent(SYNC_QUEUE_EVENT));
};

export const getPendingSyncCount = () => readQueue().length;

let flushing: Promise<void> | null = null;

/** Rejoue les écritures en attente (au retour du réseau ou au démarrage). */
export const flushSyncQueue = () => {
  flushing ??= (async () => {
    try {
      let queue = readQueue();
      while (queue.length) {
        const [next, ...rest] = queue;
        try {
          await api(next.method, next.path, next.body);
        } catch (err) {
          // Réseau toujours absent ou session expirée : on réessaiera plus tard
          if (
            err instanceof ApiError &&
            (err.status === 0 || err.status === 401 || err.status >= 500 || err.status === 429)
          )
            break;
          // Autre erreur (donnée refusée par le serveur) : l'élément est abandonné pour ne pas bloquer la file
          console.warn(
            `Synchronisation abandonnée (${next.path}) :`,
            err instanceof Error ? err.message : err,
          );
        }
        queue = rest;
        writeQueue(queue);
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
};

/** Appel « en arrière-plan » : mis en file s'il n'y a pas de réseau, sans interrompre l'utilisateur. */
export const apiInBackground = (method: WriteMethod, path: string, body?: unknown) => {
  // Des écritures déjà en attente : on respecte l'ordre en passant par la file
  if (readQueue().length) {
    writeQueue([...readQueue(), { method, path, body }]);
    if (navigator.onLine) flushSyncQueue();
    return Promise.resolve(null);
  }
  return api(method, path, body).catch((err) => {
    if (err instanceof ApiError && err.status === 0) {
      writeQueue([...readQueue(), { method, path, body }]);
    } else {
      console.warn(
        `Synchronisation impossible (${path}) :`,
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  });
};

// ---- Types des réponses serveur ----
export interface ServerSnapshot {
  user: {
    id: number;
    name: string;
    email: string;
    role: 'Particulier' | 'Étudiant' | 'Professionnel' | 'Entreprise';
    title: string | null;
    avatar: string | null;
    points: number;
    level: number;
    createdAt: string;
    migrated: boolean;
    isAdmin?: boolean;
    communityPosts?: number;
    settings: {
      theme?: 'dark' | 'light';
      language?: 'fr' | 'en' | 'es';
      bookmarks?: string[];
      defaultQuizCount?: number;
      defaultQuizDifficulty?: string;
      onboarded?: boolean;
      showInLeaderboard?: boolean;
    };
  };
  progress: Record<string, string[]>;
  certificates: import('../types').Certificate[];
  quizHistory: import('../types').QuizHistoryEntry[];
}
