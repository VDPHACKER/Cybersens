import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { handleGeminiProxy } from './server/geminiProxy.mjs';
import { SECURITY_HEADERS } from './server/securityHeaders.mjs';

// La clé Gemini reste côté serveur : elle n'est plus injectée dans le code envoyé au navigateur.
// Le navigateur appelle /api/..., servi ici (dev / preview) ou par server/index.mjs (production).
// L'API (et donc la base SQLite) n'est chargée qu'au démarrage du serveur, jamais pendant le build.
const apiPlugin = (apiKey: string | undefined): Plugin => {
  let api: Promise<typeof import('./server/api.mjs')> | undefined;
  const middleware = (req: any, res: any, next: () => void) => {
    api ??= import('./server/api.mjs');
    api
      .then(async ({ handleApi, getSessionUser }) => {
        if (await handleGeminiProxy(req, res, apiKey, (r) => !!getSessionUser(r))) return;
        if (!(await handleApi(req, res))) next();
      })
      .catch(next);
  };
  return {
    name: 'cybersens-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
};

// Application web progressive : manifeste, service worker Workbox (pré-cache du build) et invite de mise à jour
const pwaPlugin = () =>
  VitePWA({
    registerType: 'prompt', // l'utilisateur choisit quand appliquer une nouvelle version
    injectRegister: false, // enregistrement fait par components/PWAUpdatePrompt.tsx
    // Active le service worker et le manifeste aussi en développement (npm run dev),
    // pour pouvoir tester installabilité et hors-ligne sans build de production.
    devOptions: { enabled: true },
    includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
    manifest: {
      id: '/',
      name: 'CyberSens - Sensibiliser • Protéger • Agir',
      short_name: 'CyberSens',
      description:
        'Plateforme interactive de sensibilisation à la cybersécurité : formations, quiz, certificats, laboratoires et assistant IA.',
      lang: 'fr',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone'],
      orientation: 'any',
      theme_color: '#020617',
      background_color: '#020617',
      categories: ['education', 'security', 'productivity'],
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      // Raccourcis (appui long sur l'icône de l'application installée)
      shortcuts: [
        {
          name: 'Formations',
          short_name: 'Formations',
          url: '/?tab=learn',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'Quiz',
          short_name: 'Quiz',
          url: '/?tab=quiz',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'Assistant IA CyberGuard',
          short_name: 'Assistant IA',
          url: '/?tab=ai_chat',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'Boîte à outils sécurité',
          short_name: 'Outils',
          url: '/?tab=tools',
          icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      navigateFallback: 'index.html',
      // L'API (comptes, examens, IA) n'est jamais servie depuis le cache
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [
        {
          // Illustrations des cours et actualités : disponibles hors ligne une fois consultées
          urlPattern: ({ url }) => url.origin === 'https://images.unsplash.com',
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-externes',
            expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 3600 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
  });

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      // Accessible uniquement depuis cette machine ; « npm run dev -- --host » pour l'exposer sur le réseau local
      host: 'localhost',
    },
    preview: {
      headers: SECURITY_HEADERS,
    },
    plugins: [react(), apiPlugin(env.GEMINI_API_KEY), pwaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
