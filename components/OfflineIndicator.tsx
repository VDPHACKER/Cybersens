import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { WifiOff, CloudUpload } from 'lucide-react';
import { getPendingSyncCount, SYNC_QUEUE_EVENT } from '../services/apiClient';

/** Bandeau hors ligne + nombre de modifications en attente de synchronisation. */
export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState(getPendingSyncCount);

  useEffect(() => {
    const update = () => setPending(getPendingSyncCount());
    window.addEventListener(SYNC_QUEUE_EVENT, update);
    return () => window.removeEventListener(SYNC_QUEUE_EVENT, update);
  }, []);

  if (isOnline && pending === 0) return null;

  const plural = pending > 1 ? 's' : '';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 flex items-center gap-2.5 rounded-xl backdrop-blur-md px-4 py-2.5 text-xs font-semibold shadow-2xl border ${
        isOnline
          ? 'bg-sky-600/95 text-white border-sky-400/40'
          : 'bg-amber-500/95 text-slate-950 border-amber-300/40'
      }`}
    >
      {isOnline ? (
        <CloudUpload className="w-4 h-4 animate-pulse" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      <span>
        {isOnline
          ? `Synchronisation de ${pending} modification${plural}…`
          : pending > 0
            ? `Hors ligne — ${pending} modification${plural} enregistrée${plural}, envoi au retour du réseau.`
            : 'Hors ligne — vos cours et quiz restent accessibles.'}
      </span>
    </div>
  );
};
