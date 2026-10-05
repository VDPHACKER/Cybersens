// Serveur de production : sert le build (dist/) avec les en-têtes de sécurité et héberge le relais Gemini.
// Lancement : npm run build && npm start   (clé lue dans .env.local ou dans les variables d'environnement)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleGeminiProxy } from './geminiProxy.mjs';
import { handleApi, getSessionUser } from './api.mjs';
import { closeLiveStreams } from './liveFeed.mjs';
import { DB_LABEL, closeDb } from './db.mjs';
import { SECURITY_HEADERS, HSTS_HEADER } from './securityHeaders.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
// Mettre TRUST_PROXY=1 derrière un reverse-proxy HTTPS (nginx, Render, Railway…) pour activer HSTS
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html introuvable : lancez d’abord « npm run build ».');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('PLACEHOLDER')) {
  console.warn('GEMINI_API_KEY absente : l’assistant IA répondra « non configuré ».');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const serveFile = (res, filePath, status = 200) => {
  const ext = path.extname(filePath).toLowerCase();
  const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // Fichiers versionnés par Vite : cache long ; le reste (index.html, sw.js, manifeste) toujours revalidé,
    // indispensable pour que les mises à jour du service worker soient détectées
    'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
};

// Journal d'accès au format JSON (une ligne par requête) : facile à exploiter par Docker, Loki, Datadog…
// Seuls la méthode, le chemin (sans paramètres) et le statut sont journalisés : jamais de corps ni de cookie.
const logAccess = (req, res, start) => {
  if (process.env.ACCESS_LOG === '0') return;
  const path_ = (req.url || '/').split('?')[0];
  if (path_ === '/api/health') return; // évite le bruit des sondes de santé
  console.log(
    JSON.stringify({
      t: new Date().toISOString(),
      method: req.method,
      path: path_,
      status: res.statusCode,
      ms: Math.round(performance.now() - start),
    }),
  );
};

const server = http.createServer(async (req, res) => {
  const start = performance.now();
  res.on('finish', () => logAccess(req, res, start));
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https') {
    for (const [k, v] of Object.entries(HSTS_HEADER)) res.setHeader(k, v);
  }

  try {
    if (
      await handleGeminiProxy(req, res, process.env.GEMINI_API_KEY, (r) => getSessionUser(r), {
        trustProxy: TRUST_PROXY,
      })
    )
      return;
    if (await handleApi(req, res, { trustProxy: TRUST_PROXY })) return;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }

    // Résolution sûre du chemin : interdit toute sortie du dossier dist (path traversal)
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const filePath = path.normalize(path.join(DIST, pathname));
    if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
      res.writeHead(400);
      return res.end();
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(res, filePath);
    // Application monopage : toute route inconnue sans extension renvoie index.html
    if (!path.extname(pathname)) return serveFile(res, path.join(DIST, 'index.html'));
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
  } catch (err) {
    console.error('[server] Erreur :', err instanceof Error ? err.message : err);
    if (!res.headersSent) res.writeHead(400);
    res.end();
  }
});

server.listen(PORT, HOST, () =>
  console.log(`CyberSens en ligne sur http://localhost:${PORT} (base : ${DB_LABEL})`),
);

// Arrêt propre (docker stop, redéploiement) : on termine les requêtes en cours puis on ferme la base
const shutdown = (signal) => {
  console.log(`${signal} reçu : arrêt en cours…`);
  closeLiveStreams();
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
