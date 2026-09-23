// Relais sécurisé vers l'API Gemini : la clé reste côté serveur et n'est jamais envoyée au navigateur.
// Utilisé par le serveur de développement Vite (vite.config.ts) et par le serveur de production (server/index.mjs).

import { checkOrigin } from './csrf.mjs';

const UPSTREAM = 'https://generativelanguage.googleapis.com';
export const PROXY_PREFIX = '/api/gemini';

// Seuls ces modèles et ces méthodes peuvent être appelés via le relais
const ALLOWED_MODELS = new Set(['gemini-3.8-flash']);
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
 * @param {(req: import('node:http').IncomingMessage) => boolean} [isAuthorized]
 */
export const handleGeminiProxy = async (req, res, apiKey, isAuthorized = () => true) => {
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
    checkOrigin(req);
  } catch (err) {
    return (sendJson(res, err.status || 403, err.message || 'Origine refusée'), true);
  }

  // L'assistant IA est réservé aux utilisateurs connectés (évite un relais ouvert à tous)
  if (!isAuthorized(req))
    return (sendJson(res, 401, 'Connectez-vous pour utiliser l’assistant IA'), true);

  const match = ALLOWED_PATH.exec(url.pathname.slice(PROXY_PREFIX.length));
  if (!match || !ALLOWED_MODELS.has(match[1]))
    return (sendJson(res, 404, 'Point d’accès inconnu'), true);

  if (!(req.headers['content-type'] || '').includes('application/json'))
    return (sendJson(res, 415, 'JSON attendu'), true);

  if (!apiKey || apiKey.includes('PLACEHOLDER'))
    return (sendJson(res, 503, 'Assistant IA non configuré sur le serveur'), true);

  const ip = req.socket.remoteAddress || 'inconnu';
  if (isRateLimited(ip))
    return (sendJson(res, 429, 'Trop de requêtes, réessayez dans une minute'), true);

  let body;
  try {
    body = await readBody(req);
    JSON.parse(body.toString('utf8'));
  } catch (err) {
    return (sendJson(res, err.status || 400, err.status ? err.message : 'JSON invalide'), true);
  }

  // Seul le paramètre alt=sse (streaming) est transmis ; aucune clé venant du client n'est acceptée
  const upstreamUrl = new URL(url.pathname.slice(PROXY_PREFIX.length), UPSTREAM);
  if (match[2] === 'streamGenerateContent') upstreamUrl.searchParams.set('alt', 'sse');

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
      signal: AbortSignal.timeout(120_000),
    });

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
