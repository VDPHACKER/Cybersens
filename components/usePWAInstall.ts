import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/*
 * Le navigateur émet « beforeinstallprompt » une seule fois, très tôt (souvent pendant l'écran de connexion,
 * avant que le bouton d'installation n'existe). On le capture donc au chargement du module (importé dans index.tsx)
 * et on le partage avec tous les composants qui utilisent le hook.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true);

if (typeof window !== 'undefined') {
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // on affiche notre propre bouton au bon moment
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

export function usePWAInstall() {
  const [, forceRender] = useState(0);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    const promptEvent = deferredPrompt;
    deferredPrompt = null; // l'invitation ne peut servir qu'une fois
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') installed = true;
    notify();
    return outcome === 'accepted';
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: installed,
    isIOS,
    install,
  };
}
