// Relais sécurisé vers l'API Gemini : la clé reste côté serveur et n'est jamais envoyée au navigateur.
// Utilisé par le serveur de développement Vite (vite.config.ts) et par le serveur de production (server/index.mjs).

import { checkOrigin } from './csrf.mjs';

const UPSTREAM = 'https://generativelanguage.googleapis.com';
export const PROXY_PREFIX = '/api/gemini';

// Seuls ces modèles et ces méthodes peuvent être appelés via le relais
const ALLOWED_MODELS = new Set(['gemini-3.8-flash']);
// Modèles de secours essayés quand le modèle principal est surchargé ou injoignable (surchargeable via GEMINI_FALLBACK_MODELS).
// Les modèles « lite » répondent en 1 à 2 s même quand les modèles « flash » sont saturés.
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.5-flash-lite,gemini-flash-lite-latest'
)
  .split(',')
  .map((m) => m.trim())
  .filter((m) => /^[a-z0-9.-]+$/.test(m));
const RETRYABLE_STATUS = new Set([429, 500, 503, 504]);
// Délai maximal avant le premier octet de réponse : au-delà, on passe au modèle suivant au lieu d'attendre
const HEADER_TIMEOUT_MS = Number(process.env.GEMINI_HEADER_TIMEOUT_MS) || 5_000;
// Un modèle en échec est ignoré pendant ce délai : seule la première requête subit l'attente (modèle supprimé : plus long)
const COOLDOWN_MS = 180_000;
const GONE_COOLDOWN_MS = 10 * 60_000;
const skipUntil = new Map();

/** Réservé aux tests : oublie l'état de santé des modèles. */
export const resetGeminiHealth = () => skipUntil.clear();
const ALLOWED_PATH = /^\/v1beta\/models\/([a-z0-9.-]+):(generateContent|streamGenerateContent)$/;

const MAX_BODY_BYTES = 8 * 1024 * 1024; // images en base64 incluses
const RATE_LIMIT = 30; // requêtes par fenêtre et par IP
const RATE_WINDOW_MS = 60_000;

const hits = new Map();

const isRateLimited = (ip) => {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    if (hits.size > 10_000) hits.clear(); // borne mémoire
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
};

const sendJson = (res, status, message) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(status === 413 ? { Connection: 'close' } : {}),
  });
  res.end(JSON.stringify({ error: { message } }));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // On cesse de stocker les données (le reste est ignoré) et on répond 413
        req.removeAllListeners('data');
        req.resume();
        reject(Object.assign(new Error('Requête trop volumineuse'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/**
 * Gère une requête si elle cible le relais. Retourne false si l'URL ne le concerne pas.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string | undefined} apiKey
 * @param {(req: import('node:http').IncomingMessage) => unknown | Promise<unknown>} [isAuthorized] renvoie une valeur fausse si non connecté, ou l'utilisateur (objet avec id) pour un quota par compte
 */
export const handleGeminiProxy = async (
  req,
  res,
  apiKey,
  isAuthorized = () => true,
  { trustProxy = false } = {},
) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (!url.pathname.startsWith(PROXY_PREFIX + '/')) return false;

  // Indique seulement si l'IA est configurée, sans jamais exposer la clé
  if (url.pathname === PROXY_PREFIX + '/status' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ configured: !!apiKey && !apiKey.includes('PLACEHOLDER') }));
    return true;
  }

  if (req.method !== 'POST') return (sendJson(res, 405, 'Méthode non autorisée'), true);

  try {
    checkOrigin(req, { trustProxy });
  } catch (err) {
    return (sendJson(res, err.status || 403, err.message || 'Origine refusée'), true);
  }

  // L'assistant IA est réservé aux utilisateurs connectés (évite un relais ouvert à tous)
  // isAuthorized peut renvoyer l'utilisateur (objet avec id) : le quota est alors par compte
  const auth = await isAuthorized(req);
  if (!auth) return (sendJson(res, 401, 'Connectez-vous pour utiliser l’assistant IA'), true);

  const match = ALLOWED_PATH.exec(url.pathname.slice(PROXY_PREFIX.length));
  if (!match || !ALLOWED_MODELS.has(match[1]))
    return (sendJson(res, 404, 'Point d’accès inconnu'), true);

  if (!(req.headers['content-type'] || '').includes('application/json'))
    return (sendJson(res, 415, 'JSON attendu'), true);

  if (!apiKey || apiKey.includes('PLACEHOLDER'))
    return (sendJson(res, 503, 'Assistant IA non configuré sur le serveur'), true);

  // Derrière un reverse-proxy, remoteAddress est celle du proxy : le quota ne doit pas être partagé par tous
  const forwarded = trustProxy
    ? String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim()
    : '';
  const rateKey =
    typeof auth === 'object' && auth?.id != null
      ? `user:${auth.id}`
      : forwarded || req.socket.remoteAddress || 'inconnu';
  if (isRateLimited(rateKey))
    return (sendJson(res, 429, 'Trop de requêtes, réessayez dans une minute'), true);

  let body;
  try {
    body = await readBody(req);
    JSON.parse(body.toString('utf8'));
  } catch (err) {
    return (sendJson(res, err.status || 400, err.status ? err.message : 'JSON invalide'), true);
  }

  // Seul le paramètre alt=sse (streaming) est transmis ; aucune clé venant du client n'est acceptée
  const buildUrl = (model) => {
    const u = new URL(`/v1beta/models/${model}:${match[2]}`, UPSTREAM);
    if (match[2] === 'streamGenerateContent') u.searchParams.set('alt', 'sse');
    return u;
  };
  // Le délai « premier octet » ne couvre que l'attente des en-têtes : une réponse en cours de flux n'est pas coupée.
  // Sans streaming, les en-têtes n'arrivent qu'une fois toute la réponse générée : délai plus long.
  const headerTimeoutMs =
    match[2] === 'streamGenerateContent' ? HEADER_TIMEOUT_MS : HEADER_TIMEOUT_MS * 5;
  const callModel = async (model) => {
    const slow = new AbortController();
    const timer = setTimeout(() => slow.abort(), headerTimeoutMs);
    try {
      return await fetch(buildUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: AbortSignal.any([slow.signal, AbortSignal.timeout(120_000)]),
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    // Modèle demandé puis modèles de secours ; ceux qui viennent d'échouer sont ignorés (sauf s'il n'en reste aucun).
    const chain = [...new Set([match[1], ...FALLBACK_MODELS])];
    const healthy = chain.filter((m) => (skipUntil.get(m) ?? 0) <= Date.now());
    const attempts = healthy.length ? healthy : chain;
    let upstream;
    for (let i = 0; i < attempts.length; i++) {
      const last = i === attempts.length - 1;
      try {
        upstream = await callModel(attempts[i]);
      } catch (err) {
        skipUntil.set(attempts[i], Date.now() + COOLDOWN_MS);
        console.warn(`[gemini-proxy] ${attempts[i]} injoignable ou trop lent (${err.name})`);
        if (last) throw err;
        continue;
      }
      const gone = upstream.status === 404;
      if (!(RETRYABLE_STATUS.has(upstream.status) || gone) || last) break;
      skipUntil.set(attempts[i], Date.now() + (gone ? GONE_COOLDOWN_MS : COOLDOWN_MS));
      console.warn(`[gemini-proxy] ${attempts[i]} → HTTP ${upstream.status}, modèle suivant`);
      await upstream.body?.cancel().catch(() => {});
    }

    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    });
    if (!upstream.body) return (res.end(), true);
    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (err) {
    console.error(
      '[gemini-proxy] Échec de l’appel amont :',
      err instanceof Error ? err.message : err,
    );
    if (!res.headersSent) sendJson(res, 502, 'Service IA momentanément indisponible');
    else res.end();
  }
  return true;
};
