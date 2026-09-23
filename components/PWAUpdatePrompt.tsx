import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

const UPDATE_CHECK_MS = 60 * 60 * 1000; // recherche d'une nouvelle version toutes les heures

/**
 * Enregistre le service worker et informe l'utilisateur :
 * - quand l'application est prête à fonctionner hors ligne (premier chargement) ;
 * - quand une nouvelle version est disponible (mise à jour à sa demande, sans perte de saisie en cours).
 */
export const PWAUpdatePrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(async () => {
        if (registration.installing || !navigator.onLine) return;
        // Vérifie que le serveur répond avant de demander la mise à jour
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        }).catch(() => null);
        if (response?.status === 200) await registration.update();
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.warn('Enregistrement du service worker impossible :', error);
    },
  });

  // Le message « prêt hors ligne » disparaît de lui-même
  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[60] bottom-24 lg:bottom-6 left-4 right-4 lg:left-6 lg:right-auto lg:max-w-sm p-4 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl flex items-start gap-3"
    >
      <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
        {needRefresh ? <RefreshCw className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          {needRefresh ? 'Nouvelle version disponible' : 'Prêt pour le hors ligne'}
        </p>
        <p className="text-xs text-slate-300 mt-0.5">
          {needRefresh
            ? 'Une mise à jour de CyberSens est prête. Elle s’appliquera au rechargement de la page.'
            : 'CyberSens est enregistré sur cet appareil : vos cours restent accessibles sans connexion.'}
        </p>
        {needRefresh && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold transition-colors"
            >
              Mettre à jour
            </button>
            <button
              onClick={close}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors"
            >
              Plus tard
            </button>
          </div>
        )}
      </div>
      <button onClick={close} className="text-slate-400 hover:text-white" aria-label="Fermer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
