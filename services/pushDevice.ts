// Utilitaires d'appareil pour les notifications Web Push (sans dépendance vers le reste de l'application,
// pour pouvoir être utilisés par persistenceService à la déconnexion).

// Compte (identifiant) qui a activé les notifications sur cet appareil : elles ne suivent pas un autre compte
export const OPT_IN_KEY = 'cybersens_push_optin';
// Destination de cet appareil, pour pouvoir la retirer côté serveur dès la déconnexion
const ENDPOINT_KEY = 'cybersens_push_endpoint';

export const readLocal = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
export const writeLocal = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : l'abonnement reste valable pour la session */
  }
};

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// Sans service worker actif (ex. build sans PWA), `ready` ne se résout jamais : on abandonne après 5 s
export const getRegistration = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service worker indisponible')), 5000),
    ),
  ]);

export const getStoredPushEndpoint = () => readLocal(ENDPOINT_KEY);
export const setStoredPushEndpoint = (endpoint: string | null) =>
  writeLocal(ENDPOINT_KEY, endpoint);

/** Après déconnexion : l'appareil ne reçoit plus rien (le choix du compte est conservé pour sa prochaine connexion). */
export const releasePushDevice = async (): Promise<void> => {
  setStoredPushEndpoint(null);
  if (!pushSupported()) return;
  try {
    const reg = await getRegistration();
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch {
    /* rien à libérer */
  }
};
