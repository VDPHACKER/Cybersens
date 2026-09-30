import { QuizHistoryEntry, UserPreferences, AuditLogEntry, Certificate, UserBadge } from '../types';
import { apiInBackground, api, ServerSnapshot, SYNC_QUEUE_KEY } from './apiClient';
import { COMPREHENSIVE_COURSE_MODULES } from './coursesData';

/*
 * Le stockage local sert de cache synchrone pour l'interface.
 * La source de vérité est la base de données du serveur : chaque écriture y est répercutée,
 * et le cache est rechargé depuis le serveur à chaque connexion (applyServerSnapshot).
 */

const KEYS = {
  HISTORY: 'cybershield_history',
  PREFS: 'cybershield_prefs',
  LOGS: 'cybershield_audit_logs',
  BOOKMARKS: 'cybersens_bookmarks',
  COMPLETED_LESSONS: 'cybersens_completed_lessons',
  CERTIFICATES: 'cybersens_certificates',
  ACCOUNTS: 'cybersens_accounts',
  CACHE_OWNER: 'cybersens_cache_owner',
};

const isLoggedIn = () => getPreferences().isAuthenticated === true;

// Lecture tolérante : une donnée corrompue ou modifiée à la main ne doit pas faire planter l'application
const readJson = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const saveQuizResult = (entry: QuizHistoryEntry) => {
  const history = getQuizHistory();
  history.unshift(entry);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history.slice(0, 50)));
  if (isLoggedIn()) {
    apiInBackground('POST', '/api/quiz-results', {
      score: entry.score,
      total: entry.total,
      mode: entry.mode,
      difficulty: entry.difficulty,
    });
  }

  addAuditLog(
    `Quiz ${entry.mode} terminé avec un score de ${entry.score}/${entry.total}`,
    'Quiz',
    'info',
  );
};

export const getQuizHistory = (): QuizHistoryEntry[] => {
  const history = readJson<QuizHistoryEntry[]>(KEYS.HISTORY, []);
  return Array.isArray(history) ? history : [];
};

export const addAuditLog = (
  event: string,
  category: AuditLogEntry['category'],
  level: AuditLogEntry['level'],
) => {
  const logs = getAuditLogs();
  const newLog: AuditLogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    event,
    category,
    level,
  };
  logs.unshift(newLog);
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs.slice(0, 100)));
};

export const getAuditLogs = (): AuditLogEntry[] => {
  const logs = readJson<AuditLogEntry[]>(KEYS.LOGS, []);
  return Array.isArray(logs) ? logs : [];
};

export const clearAuditLogs = () => {
  localStorage.removeItem(KEYS.LOGS);
};

export const clearQuizHistory = () => {
  localStorage.removeItem(KEYS.HISTORY);
  if (isLoggedIn()) apiInBackground('DELETE', '/api/quiz-results');
};

export const savePreferences = (prefs: UserPreferences) => {
  try {
    localStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
  } catch (err) {
    console.warn('Failed to save full preferences, attempting storage recovery:', err);
    try {
      // Fallback: If localStorage quota exceeded due to high-res avatar, fallback to compact avatar
      const fallbackPrefs = {
        ...prefs,
        userAvatar:
          prefs.userAvatar &&
          prefs.userAvatar.startsWith('data:') &&
          prefs.userAvatar.length > 50000
            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            : prefs.userAvatar,
      };
      localStorage.setItem(KEYS.PREFS, JSON.stringify(fallbackPrefs));
    } catch (fallbackErr) {
      console.error('Storage quota exceeded and fallback failed:', fallbackErr);
    }
  }
  window.dispatchEvent(new CustomEvent('cybersens-prefs-changed', { detail: prefs }));
  if (prefs.isAuthenticated) scheduleProfileSync(prefs);
};

// Envoi groupé (500 ms) des champs de profil et réglages, uniquement s'ils ont changé
let lastSyncedProfile = '';
let profileTimer: ReturnType<typeof setTimeout> | undefined;
const profilePayload = (prefs: UserPreferences) => ({
  name: prefs.userName,
  title: prefs.userTitle || '',
  avatar:
    prefs.userAvatar &&
    (prefs.userAvatar.startsWith('data:image/') ||
      prefs.userAvatar.startsWith('https://images.unsplash.com/'))
      ? prefs.userAvatar
      : null,
  settings: {
    theme: prefs.theme,
    language: prefs.language || 'fr',
    defaultQuizCount: prefs.defaultQuizCount,
    defaultQuizDifficulty: prefs.defaultQuizDifficulty,
    onboarded: prefs.onboarded !== false,
  },
});
const scheduleProfileSync = (prefs: UserPreferences) => {
  const payload = JSON.stringify(profilePayload(prefs));
  if (payload === lastSyncedProfile) return;
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => {
    lastSyncedProfile = payload;
    apiInBackground('PATCH', '/api/me', JSON.parse(payload));
  }, 500);
};

export const getPreferences = (): UserPreferences => {
  const defaultPrefs: UserPreferences = {
    theme: 'light', // Mode clair par défaut, matching design photo
    userName: 'Invité CyberSens',
    userEmail: '',
    userTitle: 'Apprenant visiteur',
    role: 'Étudiant',
    level: 1,
    points: 0,
    badgesCount: 0,
    formationsCount: 0,
    userAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    defaultQuizCount: 10,
    defaultQuizDifficulty: 'Moyen',
    language: 'fr',
    onboarded: true,
    isAuthenticated: false,
    registeredAt: undefined,
  };

  const parsed = readJson<Partial<UserPreferences> | null>(KEYS.PREFS, null);
  return parsed && typeof parsed === 'object' ? { ...defaultPrefs, ...parsed } : defaultPrefs;
};

export const getBookmarks = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.BOOKMARKS);
    return data ? JSON.parse(data) : ['article-1', 'module-1'];
  } catch {
    return ['article-1', 'module-1'];
  }
};

export const toggleBookmark = (id: string): boolean => {
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(id);
  let isNowBookmarked = false;
  if (index >= 0) {
    bookmarks.splice(index, 1);
    isNowBookmarked = false;
  } else {
    bookmarks.push(id);
    isNowBookmarked = true;
  }
  localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  if (isLoggedIn()) apiInBackground('PATCH', '/api/me', { settings: { bookmarks } });
  return isNowBookmarked;
};

/* --- Course Progress --- */
// Format stocké : { [courseId]: lessonId[] }
const getAllCompletedLessons = (): Record<string, string[]> => {
  try {
    const data = localStorage.getItem(KEYS.COMPLETED_LESSONS);
    const parsed = data ? JSON.parse(data) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const getCompletedLessons = (courseId: string): string[] => {
  const lessons = getAllCompletedLessons()[courseId];
  return Array.isArray(lessons) ? lessons : [];
};

/** Retourne true si la leçon vient d'être marquée (false si elle l'était déjà). */
export const markLessonCompleted = (courseId: string, lessonId: string): boolean => {
  const all = getAllCompletedLessons();
  const lessons = Array.isArray(all[courseId]) ? all[courseId] : [];
  if (lessons.includes(lessonId)) return false;
  all[courseId] = [...lessons, lessonId];
  try {
    localStorage.setItem(KEYS.COMPLETED_LESSONS, JSON.stringify(all));
  } catch (err) {
    console.warn('Impossible de sauvegarder la progression du cours :', err);
  }
  if (isLoggedIn()) apiInBackground('POST', '/api/progress', { courseId, lessonId });
  return true;
};

export const isBookmarked = (id: string): boolean => {
  return getBookmarks().includes(id);
};

const levelFor = (points: number) => Math.max(1, Math.floor(points / 200) + 1);

/** Remplace le total local par la valeur faisant autorité (renvoyée par le serveur). */
export const setLocalPoints = (points: number) => {
  const prefs = getPreferences();
  if (prefs.points === points) return;
  savePreferences({ ...prefs, points, level: levelFor(points) });
};

export const addPoints = (pts: number) => {
  const prefs = getPreferences();
  const currentPts = (prefs.points || 0) + pts;
  savePreferences({
    ...prefs,
    points: currentPts,
    level: levelFor(currentPts),
  });
  // Mise à jour optimiste, puis alignement sur le total enregistré en base
  if (prefs.isAuthenticated && pts > 0) {
    apiInBackground('POST', '/api/me/points', { delta: Math.min(Math.round(pts), 200) }).then(
      (res) => {
        if (res && typeof (res as any).points === 'number') setLocalPoints((res as any).points);
      },
    );
  }
};

export const getStats = () => {
  const history = getQuizHistory();
  const totalQuizzes = history.length;
  const avgScore =
    totalQuizzes > 0
      ? Math.round(
          (history.reduce((acc, curr) => acc + curr.score / curr.total, 0) / totalQuizzes) * 100,
        )
      : 0;

  return {
    totalQuizzes,
    avgScore,
    bestSolo: history
      .filter((h) => h.mode === 'Solo')
      .reduce((max, h) => Math.max(max, h.score), 0),
  };
};

/* --- Certificates System --- */
export const getCertificates = (): Certificate[] => {
  try {
    const data = localStorage.getItem(KEYS.CERTIFICATES);
    // Un certificat n'existe que s'il a été obtenu en réussissant l'examen du module
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/** Enregistre dans le cache un certificat délivré par le serveur (les points sont attribués côté serveur). */
export const saveCertificate = (cert: Certificate): void => {
  const certs = getCertificates();
  // Check if exists
  const existingIdx = certs.findIndex((c) => c.courseId === cert.courseId);
  if (existingIdx >= 0) {
    certs[existingIdx] = cert;
  } else {
    certs.unshift(cert);
  }
  localStorage.setItem(KEYS.CERTIFICATES, JSON.stringify(certs));

  addAuditLog(`Certificat délivré pour: ${cert.courseTitle}`, 'Système', 'info');
};

/* --- Dynamic Progression Badges --- */
const BADGE_UNLOCKS_KEY = 'cybersens_badge_unlocks';

const readUnlocks = (): Record<string, string> => {
  const data = readJson<Record<string, string>>(BADGE_UNLOCKS_KEY, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
};

/**
 * Date d'obtention d'un badge : issue des données quand elles existent (premier quiz, 5e quiz…),
 * sinon le moment où le badge a été constaté pour la première fois. Mémorisée localement.
 */
const unlockDate = (id: string, unlocked: boolean, fromData?: string): string | undefined => {
  if (!unlocked) return undefined;
  const stored = readUnlocks();
  let iso = stored[id];
  if (!iso) {
    iso =
      fromData && !Number.isNaN(new Date(fromData).getTime())
        ? new Date(fromData).toISOString()
        : new Date().toISOString();
    try {
      localStorage.setItem(BADGE_UNLOCKS_KEY, JSON.stringify({ ...stored, [id]: iso }));
    } catch {
      /* stockage indisponible : la date sera recalculée */
    }
  }
  const lang = getPreferences().language;
  const locale = lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR';
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const getDynamicBadges = (): UserBadge[] => {
  const prefs = getPreferences();
  const history = getQuizHistory();
  const certs = getCertificates();
  const pts = prefs.points ?? 0;
  const anyLesson = Object.values(getAllCompletedLessons()).some(
    (l) => Array.isArray(l) && l.length > 0,
  );
  const byDate = [...history].sort(
    (x, y) => new Date(x.date).getTime() - new Date(y.date).getTime(),
  );

  // Module « Sécurité mobile » : progression réelle des leçons, ou certificat obtenu
  const mobileModule = COMPREHENSIVE_COURSE_MODULES.find((m) => m.id === 'module-5');
  const mobileDone = mobileModule
    ? getCompletedLessons(mobileModule.id).filter((id) =>
        mobileModule.lessons.some((l) => l.id === id),
      ).length
    : 0;
  const mobileCertified = certs.some((c) => c.courseId === 'module-5');
  const mobileProgress = mobileCertified
    ? 100
    : mobileModule && mobileModule.lessons.length
      ? Math.round((mobileDone / mobileModule.lessons.length) * 100)
      : 0;
  const posted = (prefs.communityPosts ?? 0) > 0;

  const firstStep = history.length > 0 || certs.length > 0 || anyLesson;
  const quizWarrior = history.length >= 5;

  const allBadges: UserBadge[] = [
    {
      id: 'badge-1',
      title: 'Premier Pas Sécurisé',
      icon: 'shield',
      description: 'Avoir complété une première leçon ou un premier quiz.',
      category: 'cours',
      unlocked: firstStep,
      progressPercent: firstStep ? 100 : 0,
      unlockedAt: unlockDate('badge-1', firstStep, byDate[0]?.date),
    },
    {
      id: 'badge-2',
      title: 'Chasseur de Phishing',
      icon: 'phishing',
      description: 'Cumuler 300 points d’expérience en vous entraînant contre les arnaques.',
      category: 'expert',
      unlocked: pts >= 300,
      progressPercent: Math.min(100, Math.round((pts / 300) * 100)),
      unlockedAt: unlockDate('badge-2', pts >= 300),
    },
    {
      id: 'badge-3',
      title: 'Maître des Mots de Passe',
      icon: 'key',
      description:
        'Cumuler 400 points d’expérience : robustesse et double authentification (2FA) maîtrisées.',
      category: 'expert',
      unlocked: pts >= 400,
      progressPercent: Math.min(100, Math.round((pts / 400) * 100)),
      unlockedAt: unlockDate('badge-3', pts >= 400),
    },
    {
      id: 'badge-4',
      title: 'Certifié CyberSens',
      icon: 'graduation',
      description: 'Obtenir au moins un certificat officiel d’aptitude en cybersécurité.',
      category: 'cours',
      unlocked: certs.length > 0,
      progressPercent: certs.length > 0 ? 100 : 0,
      unlockedAt: certs.length > 0 ? certs[0].issuedDate : undefined,
    },
    {
      id: 'badge-5',
      title: 'Guerrier des Quiz',
      icon: 'trophy',
      description: 'Terminer 5 sessions de quiz interactifs.',
      category: 'quiz',
      unlocked: quizWarrior,
      progressPercent: Math.min(100, Math.round((history.length / 5) * 100)),
      unlockedAt: unlockDate('badge-5', quizWarrior, byDate[4]?.date),
    },
    {
      id: 'badge-6',
      title: 'Sentinelle Mobile Money',
      icon: 'mobile',
      description: 'Valider le module de défense contre les arnaques et les risques mobiles.',
      category: 'expert',
      unlocked: mobileCertified,
      progressPercent: mobileProgress,
      unlockedAt: unlockDate('badge-6', mobileCertified),
    },
    {
      id: 'badge-7',
      title: 'Vétéran Cyber (1000 Pts)',
      icon: 'star',
      description: 'Cumuler 1000 points d’expérience pratique de sécurité.',
      category: 'points',
      unlocked: pts >= 1000,
      progressPercent: Math.min(100, Math.round((pts / 1000) * 100)),
      unlockedAt: unlockDate('badge-7', pts >= 1000),
    },
    {
      id: 'badge-8',
      title: 'Défenseur Communautaire',
      icon: 'community',
      description: 'Publier au moins un message dans la communauté pour aider les autres membres.',
      category: 'expert',
      unlocked: posted,
      progressPercent: posted ? 100 : 0,
      unlockedAt: unlockDate('badge-8', posted),
    },
  ];

  return allBadges;
};

/* --- Compte, cache et synchronisation avec le serveur --- */
export interface UserAccountData {
  name: string;
  email: string;
  password?: string;
  role: 'Particulier' | 'Étudiant' | 'Professionnel' | 'Entreprise';
  avatar?: string;
}

/** Ancien formulaire du profil : le compte se crée désormais sur l'écran de connexion (API). */
export const registerLearnerAccount = (_account: UserAccountData): UserPreferences =>
  getPreferences();

// La file de synchronisation hors ligne appartient aussi à l'utilisateur : effacée avec ses données
const USER_DATA_KEYS = [
  KEYS.HISTORY,
  KEYS.LOGS,
  KEYS.BOOKMARKS,
  KEYS.COMPLETED_LESSONS,
  KEYS.CERTIFICATES,
  KEYS.CACHE_OWNER,
  SYNC_QUEUE_KEY,
];

export const getCacheOwner = (): number | null => {
  const v = Number(localStorage.getItem(KEYS.CACHE_OWNER));
  return Number.isInteger(v) && v > 0 ? v : null;
};

/** Efface les données personnelles du cache (thème et langue conservés). */
export const clearUserCache = () => {
  const { theme, language } = getPreferences();
  USER_DATA_KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem(KEYS.PREFS);
  lastSyncedProfile = '';
  savePreferences({ ...getPreferences(), theme, language });
};

/** Données locales antérieures à la base (pour la migration à la première connexion). */
export const collectLocalDataForMigration = () => {
  const prefs = getPreferences();
  const certificates = getCertificates().map((c) => ({ courseId: c.courseId, score: c.score }));
  const progress = readJson<Record<string, string[]>>(KEYS.COMPLETED_LESSONS, {});
  const quizHistory = getQuizHistory();
  const bookmarks = readJson<string[] | null>(KEYS.BOOKMARKS, null);
  const hasData =
    certificates.length > 0 ||
    quizHistory.length > 0 ||
    Object.keys(progress || {}).length > 0 ||
    (prefs.points || 0) > 0;
  return {
    hasData,
    payload: {
      progress,
      quizHistory,
      certificates,
      points: Math.round(prefs.points || 0),
      settings: {
        theme: prefs.theme,
        language: prefs.language || 'fr',
        ...(Array.isArray(bookmarks) ? { bookmarks } : {}),
      },
    },
  };
};

/** Remplace le cache local par les données de la base pour l'utilisateur connecté. */
export const applyServerSnapshot = (snap: ServerSnapshot): UserPreferences => {
  const { user } = snap;
  localStorage.setItem(KEYS.COMPLETED_LESSONS, JSON.stringify(snap.progress || {}));
  localStorage.setItem(KEYS.CERTIFICATES, JSON.stringify(snap.certificates || []));
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(snap.quizHistory || []));
  if (Array.isArray(user.settings.bookmarks))
    localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(user.settings.bookmarks));
  localStorage.setItem(KEYS.CACHE_OWNER, String(user.id));

  const current = getPreferences();
  const updated: UserPreferences = {
    ...current,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
    userTitle: user.title || `${user.role} certifié`,
    userAvatar: user.avatar || current.userAvatar,
    points: user.points,
    level: user.level,
    registeredAt: user.createdAt,
    theme: user.settings.theme || current.theme,
    language: user.settings.language || current.language,
    defaultQuizCount: user.settings.defaultQuizCount || current.defaultQuizCount,
    defaultQuizDifficulty: user.settings.defaultQuizDifficulty || current.defaultQuizDifficulty,
    onboarded: user.settings.onboarded ?? current.onboarded,
    isAuthenticated: true,
    isAdmin: !!user.isAdmin,
    communityPosts: user.communityPosts ?? 0,
  };
  lastSyncedProfile = JSON.stringify(profilePayload(updated));
  savePreferences(updated);
  return updated;
};

export const logoutLearnerAccount = (): UserPreferences => {
  apiInBackground('POST', '/api/auth/logout');
  clearUserCache();
  return getPreferences();
};

export const updateUserAvatar = (avatarUrl: string): UserPreferences => {
  const current = getPreferences();
  const updated: UserPreferences = {
    ...current,
    userAvatar: avatarUrl,
  };
  savePreferences(updated);
  addAuditLog('Photo de profil mise à jour', 'Outil', 'info');
  return updated;
};

/** Recharge les données depuis le serveur (session existante). */
export const refreshFromServer = async () =>
  applyServerSnapshot(await api<ServerSnapshot>('GET', '/api/me'));
