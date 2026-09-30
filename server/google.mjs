// Vérification d'un jeton d'identité Google (« Se connecter avec Google »), sans dépendance externe.
// Le navigateur envoie le jeton JWT (RS256) ; on contrôle sa signature avec les clés publiques de Google,
// l'émetteur, l'audience (notre GOOGLE_CLIENT_ID), l'expiration et la validation de l'e-mail par Google.
import crypto from 'node:crypto';
import { HttpError } from './httpError.mjs';

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

let cache = { keys: null, expires: 0 };

/** Clés publiques de Google (JWK), mises en cache selon l'en-tête Cache-Control. */
export const fetchGoogleKeys = async () => {
  if (cache.keys && Date.now() < cache.expires) return cache.keys;
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new HttpError(502, 'Google est momentanément injoignable.');
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  const { keys } = await res.json();
  cache = { keys, expires: Date.now() + Math.min(maxAge, 86_400) * 1000 };
  return keys;
};

const decodePart = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export const verifyGoogleIdToken = async (
  credential,
  { clientId, getKeys = fetchGoogleKeys, now = Date.now() },
) => {
  const invalid = () => new HttpError(401, 'Connexion Google refusée.');
  if (!clientId || typeof credential !== 'string' || credential.length > 4096) throw invalid();
  const parts = credential.split('.');
  if (parts.length !== 3) throw invalid();

  let header;
  let claims;
  try {
    header = decodePart(parts[0]);
    claims = decodePart(parts[1]);
  } catch {
    throw invalid();
  }
  if (header.alg !== 'RS256') throw invalid();

  const jwk = (await getKeys()).find((k) => k.kid === header.kid);
  if (!jwk) throw invalid();
  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url'),
  );
  if (!valid) throw invalid();

  if (!ISSUERS.has(claims.iss) || claims.aud !== clientId) throw invalid();
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < now) throw invalid();
  if (claims.email_verified !== true || typeof claims.email !== 'string') throw invalid();

  return {
    email: claims.email.trim().toLowerCase(),
    name: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : null,
  };
};
