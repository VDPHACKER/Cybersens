// Préférence locale à l'appareil : recevoir ou non les notifications en direct (activées par défaut).
const KEY = 'cybersens_live_notifications';
export const LIVE_PREF_EVENT = 'cybersens-live-pref-changed';

export const getLiveNotifications = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setLiveNotifications = (on: boolean): void => {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    /* stockage indisponible : le réglage vaut pour la session seulement */
  }
  window.dispatchEvent(new Event(LIVE_PREF_EVENT));
};
