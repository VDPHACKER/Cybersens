// Mise en sourdine du panneau de don jusqu'à la fin de la journée (jour local de l'utilisateur).
// Module sans dépendance : le stockage est injecté, ce qui permet de le tester sans navigateur.

export const DONATE_POPUP_MUTE_KEY = 'cybersens-donate-popup-muted-on';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Jour local au format AAAA-MM-JJ (et non UTC : « aujourd'hui » suit l'horloge de l'utilisateur). */
export const localDay = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Vrai si l'utilisateur a demandé de ne plus voir le panneau aujourd'hui. */
export const isDonatePopupMuted = (storage: StorageLike, now: Date = new Date()): boolean => {
  try {
    return storage.getItem(DONATE_POPUP_MUTE_KEY) === localDay(now);
  } catch {
    return false; // stockage indisponible : on garde le comportement par défaut
  }
};

/** Coupe le panneau pour le reste de la journée. Le lendemain, il revient automatiquement. */
export const muteDonatePopupToday = (storage: StorageLike, now: Date = new Date()): void => {
  try {
    storage.setItem(DONATE_POPUP_MUTE_KEY, localDay(now));
  } catch {
    /* stockage indisponible : le panneau se fermera simplement pour cette fois */
  }
};
