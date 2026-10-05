import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import {
  LIVE_PREF_EVENT,
  getLiveNotifications,
  setLiveNotifications,
} from '../services/liveNotificationsPref';
import { Card, useL } from './ui';

/** Réglage : recevoir ou non les notifications en direct (Communauté, actualités) sur cet appareil. */
export const LiveNotificationsCard: React.FC = () => {
  const L = useL();
  const [on, setOn] = useState(getLiveNotifications());

  useEffect(() => {
    const sync = () => setOn(getLiveNotifications());
    window.addEventListener(LIVE_PREF_EVENT, sync);
    return () => window.removeEventListener(LIVE_PREF_EVENT, sync);
  }, []);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black">
            {L('Notifications en direct', 'Live notifications', 'Notificaciones en directo')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Être prévenu quand un membre publie dans la Communauté ou qu’une actualité paraît (sur cet appareil).',
              'Get notified when a member posts in the Community or a new article appears (on this device).',
              'Recibe un aviso cuando un miembro publica en la Comunidad o aparece una noticia (en este dispositivo).',
            )}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={L(
            'Notifications en direct',
            'Live notifications',
            'Notificaciones en directo',
          )}
          onClick={() => setLiveNotifications(!on)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            on ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
    </Card>
  );
};
