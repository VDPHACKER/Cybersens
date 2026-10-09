// Notification du système (centre de notifications de Windows, barre de notifications d'Android…),
// affichée par le service worker : elle apparaît comme celles de WhatsApp et un clic ouvre CyberSens.
import { getRegistration, pushSupported } from './pushDevice';
import { shouldShowSystemNotification, type PermissionState } from './pushPrompt';

export interface SystemNotificationInput {
  title: string;
  body: string;
  /** Adresse ouverte au clic (chemin de ce site, ex. /?tab=community). */
  url?: string;
  /** Une nouvelle notification de même étiquette remplace la précédente : pas de doublon avec le push serveur. */
  tag?: string;
  /** Affiche la notification même si l'application est au premier plan (test, confirmation). */
  force?: boolean;
}

/** Affiche une notification système. Retourne false si elle n'a pas été affichée (permission, page déjà visible…). */
export const showSystemNotification = async ({
  title,
  body,
  url = '/',
  tag,
  force = false,
}: SystemNotificationInput): Promise<boolean> => {
  if (!pushSupported()) return false;
  const permission = Notification.permission as PermissionState;
  const visible = document.visibilityState === 'visible';
  const focused = document.hasFocus();
  if (
    force
      ? permission !== 'granted'
      : !shouldShowSystemNotification({ permission, visible, focused })
  )
    return false;
  try {
    const registration = await getRegistration();
    await registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag,
      ...(tag ? { renotify: true } : {}),
      data: { url: new URL(url, window.location.origin).href },
    } as NotificationOptions);
    return true;
  } catch {
    return false;
  }
};
