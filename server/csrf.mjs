// Protection CSRF partagée par toutes les routes qui modifient l'état (API et relais Gemini) :
// une requête envoyée par le navigateur doit provenir de ce même site.
import { HttpError } from './httpError.mjs';

const stripPort = (value) => {
  if (!value) return '';
  const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
  return url.host.replace(/:\d+$/, '');
};

const requestHost = (req, { trustProxy = false } = {}) => {
  if (trustProxy) {
    const forwardedHost = req.headers['x-forwarded-host'];
    if (forwardedHost) return stripPort(String(forwardedHost).split(',')[0].trim());
    const forwardedProto = req.headers['x-forwarded-proto'];
    if (forwardedProto && req.headers.host) return stripPort(String(req.headers.host));
  }
  return stripPort(req.headers.host || '');
};

export const checkOrigin = (req, { trustProxy = false } = {}) => {
  const origin = req.headers.origin;
  if (!origin) {
    // Un navigateur signale toujours l'origine d'une requête inter-sites : on la refuse.
    if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Origine refusée');
    return; // clients non-navigateurs (pas de risque CSRF)
  }
  let sourceOrigin;
  try {
    sourceOrigin = new URL(origin).host.replace(/:\d+$/, '');
  } catch {
    throw new HttpError(403, 'Origine refusée');
  }
  const host = requestHost(req, { trustProxy });
  if (sourceOrigin !== host) throw new HttpError(403, 'Origine refusée');
};
