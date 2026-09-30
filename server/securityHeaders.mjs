// En-têtes de sécurité HTTP appliqués par le serveur de production et par `vite preview`.

const CSP = [
  "default-src 'self'",
  // accounts.google.com/gsi : bouton « Se connecter avec Google » (Google Identity Services)
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' https://accounts.google.com/gsi/style",
  'frame-src https://accounts.google.com/gsi/',
  "font-src 'self'",
  "img-src 'self' data: blob: https://images.unsplash.com https://api.qrserver.com",
  "media-src 'self' data: blob:",
  // images.unsplash.com : requis pour que le service worker mette les illustrations en cache hors ligne
  "connect-src 'self' https://images.unsplash.com https://accounts.google.com/gsi/",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // allow-popups : la fenêtre de connexion Google doit pouvoir répondre à la page
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // La caméra sert au scan de documents dans l'assistant IA ; tout le reste est désactivé
  'Permissions-Policy':
    'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
};

// HSTS uniquement derrière HTTPS (sinon ignoré par les navigateurs et source de confusion en local)
export const HSTS_HEADER = { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains' };
