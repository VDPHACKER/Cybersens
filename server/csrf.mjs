// Protection CSRF partagée par toutes les routes qui modifient l'état (API et relais Gemini) :
// une requête envoyée par le navigateur doit provenir de ce même site.
import { HttpError } from './httpError.mjs';

export const checkOrigin = (req) => {
  const origin = req.headers.origin;
  if (!origin) return; // clients non-navigateurs (pas de risque CSRF)
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Origine refusée');
  }
  if (host !== req.headers.host) throw new HttpError(403, 'Origine refusée');
};
