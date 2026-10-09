// Notifications Web Push : importé par le service worker généré par Vite PWA (workbox.importScripts).
// Affiche la notification reçue du serveur dans le centre de notifications du système (comme WhatsApp)
// et ouvre l'application au clic. Le même gestionnaire de clic sert aux notifications affichées par la page.

const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

// Seules les adresses de ce site sont ouvertes au clic
const safeTarget = (raw) => {
  try {
    const url = new URL(raw || '/', self.location.origin);
    return url.origin === self.location.origin ? url.href : self.location.origin + '/';
  } catch {
    return self.location.origin + '/';
  }
};

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = text(data.title, 100) || 'CyberSens';
  const tag = text(data.tag, 40) || undefined;
  const options = {
    body: text(data.body, 240),
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag,
    // Chaque nouveau message alerte de nouveau, même s'il remplace le précédent de même étiquette
    renotify: !!tag,
    vibrate: [120, 60, 120],
    timestamp: Date.now(),
    data: { url: safeTarget(data.url) },
  };

  event.waitUntil(
    (async () => {
      // On ne masque la notification que si l'utilisateur regarde déjà l'application : fenêtre visible ET au
      // premier plan (le message s'affiche alors dans l'application). Fenêtre cachée derrière une autre : on notifie.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return;
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = safeTarget(event.notification.data && event.notification.data.url);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
