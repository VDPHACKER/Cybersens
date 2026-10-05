// Fusion des nouveaux posts dans le fil déjà affiché (fonction pure : testable sans navigateur).
/**
 * Ajoute en tête les posts de `incoming` absents de `current`, sans toucher au reste :
 * les messages déjà affichés (et chargés via « Voir plus ») gardent leur version locale.
 */
export const mergeNewPosts = <T extends { id: number }>(current: T[], incoming: T[]): T[] => {
  const known = new Set(current.map((p) => p.id));
  const fresh = incoming.filter((p) => !known.has(p.id));
  return fresh.length ? [...fresh, ...current] : current;
};
