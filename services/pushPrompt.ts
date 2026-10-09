// Règles pures (testables sans navigateur) pour les notifications système.

/** Une invitation « Activer les notifications » refusée n'est pas répétée avant ce délai. */
export const PROMPT_SNOOZE_MS = 7 * 24 * 3600 * 1000;

export type PermissionState = 'default' | 'granted' | 'denied';

/**
 * Faut-il proposer d'activer les notifications ? Oui si le navigateur sait les afficher, que l'utilisateur
 * ne les a pas refusées dans le navigateur, ne les a pas déjà activées et n'a pas répondu « Plus tard » récemment.
 */
export const shouldOfferPush = (input: {
  supported: boolean;
  permission: PermissionState;
  enabled: boolean;
  snoozedUntil: number | null;
  now: number;
}): boolean =>
  input.supported &&
  input.permission !== 'denied' &&
  !input.enabled &&
  (input.snoozedUntil === null || input.now >= input.snoozedUntil);

/**
 * Une notification système est affichée seulement si l'utilisateur ne regarde pas déjà l'application :
 * page masquée, ou fenêtre visible mais sans le focus (cachée derrière une autre appli).
 */
export const shouldShowSystemNotification = (input: {
  permission: PermissionState;
  visible: boolean;
  focused: boolean;
}): boolean => input.permission === 'granted' && !(input.visible && input.focused);
