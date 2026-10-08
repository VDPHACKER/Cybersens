// Notifications Web Push côté navigateur : abonnement de cet appareil au compte connecté.
// Le serveur envoie ensuite les notifications même application fermée ; le service worker les affiche (public/push-sw.js).
import { api } from './apiClient';
import { getCacheOwner } from './persistenceService';
import {
  OPT_IN_KEY,
  getRegistration,
  pushSupported,
  readLocal,
  setStoredPushEndpoint,
  writeLocal,
} from './pushDevice';

export { getStoredPushEndpoint, pushSupported, releasePushDevice } from './pushDevice';

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

/** iPhone/iPad : le push n'existe que pour l'application installée sur l'écran d'accueil. */
export const needsHomeScreenInstall = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
};

/** Convertit la clé publique VAPID (base64 URL) au format attendu par PushManager. */
export const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a || a.byteLength !== b.length) return false;
  const view = new Uint8Array(a);
  return view.every((v, i) => v === b[i]);
};

const currentOptIn = () => {
  const owner = getCacheOwner();
  return owner !== null && readLocal(OPT_IN_KEY) === String(owner);
};

export const getPushState = async (): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    return sub && currentOptIn() && Notification.permission === 'granted' ? 'on' : 'off';
  } catch {
    return 'unsupported';
  }
};

/** Crée (ou met à jour) l'abonnement de cet appareil et l'associe au compte connecté. */
const subscribeDevice = async (language: string): Promise<PushState> => {
  const { configured, publicKey } = await api<{ configured: boolean; publicKey: string | null }>(
    'GET',
    '/api/push/key',
  );
  if (!configured || !publicKey) return 'unconfigured';
  const key = urlBase64ToUint8Array(publicKey);
  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  // Clé du serveur changée (base réinitialisée) : l'ancien abonnement n'est plus utilisable
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await api('POST', '/api/push/subscribe', { ...sub.toJSON(), lang: language });
  setStoredPushEndpoint(sub.endpoint);
  return 'on';
};

/** À appeler depuis un clic : demande l'autorisation puis active les notifications sur cet appareil. */
export const enablePush = async (language: string): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';
  const owner = getCacheOwner();
  if (owner === null) return 'off';
  const state = await subscribeDevice(language);
  if (state === 'on') writeLocal(OPT_IN_KEY, String(owner));
  return state;
};

/** Désactive les notifications sur cet appareil (serveur et navigateur). */
export const disablePush = async (): Promise<PushState> => {
  writeLocal(OPT_IN_KEY, null);
  try {
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {
    /* rien à désabonner */
  }
  setStoredPushEndpoint(null);
  return Notification.permission === 'denied' ? 'denied' : 'off';
};

/**
 * Au démarrage d'une session : si ce compte avait activé les notifications sur cet appareil,
 * on rattache l'appareil au compte (nouvelle connexion, langue changée, abonnement renouvelé).
 */
export const syncPush = async (language: string): Promise<void> => {
  if (!pushSupported() || Notification.permission !== 'granted' || !currentOptIn()) return;
  try {
    await subscribeDevice(language);
  } catch {
    /* hors ligne ou serveur indisponible : nouvel essai au prochain démarrage */
  }
};
