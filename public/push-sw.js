// Notifications Web Push : importé par le service worker généré par Vite PWA (workbox.importScripts).
// Affiche la notification reçue du serveur et ouvre l'application au clic.

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
  const options = {
    body: text(data.body, 240),
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: text(data.tag, 40) || undefined,
    data: { url: safeTarget(data.url) },
  };

  event.waitUntil(
    (async () => {
      // Application visible à l'écran : l'avis s'affiche déjà dans l'application (flux en direct)
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === 'visible')) return;
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
