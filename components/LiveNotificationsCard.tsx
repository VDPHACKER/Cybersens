import React, { useEffect, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import {
  LIVE_PREF_EVENT,
  getLiveNotifications,
  setLiveNotifications,
} from '../services/liveNotificationsPref';
import {
  disablePush,
  enablePush,
  getPushState,
  needsHomeScreenInstall,
  type PushState,
} from '../services/pushNotifications';
import { useI18n } from '../services/i18n';
import { showSystemNotification } from '../services/systemNotification';
import { Card, useL } from './ui';

const Switch: React.FC<{
  on: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ on, label, onClick, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50 ${
      on ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
        on ? 'translate-x-5' : ''
      }`}
    />
  </button>
);

/** Réglages : notifications dans l'application ouverte, et notifications push reçues application fermée. */
export const LiveNotificationsCard: React.FC = () => {
  const L = useL();
  const { language } = useI18n();
  const [on, setOn] = useState(getLiveNotifications());
  const [pushState, setPushState] = useState<PushState | 'loading'>('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState(false);

  useEffect(() => {
    const sync = () => setOn(getLiveNotifications());
    window.addEventListener(LIVE_PREF_EVENT, sync);
    return () => window.removeEventListener(LIVE_PREF_EVENT, sync);
  }, []);

  useEffect(() => {
    let alive = true;
    void getPushState().then((state) => alive && setPushState(state));
    return () => {
      alive = false;
    };
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    setPushError(false);
    try {
      setPushState(pushState === 'on' ? await disablePush() : await enablePush(language));
    } catch {
      setPushError(true);
    } finally {
      setPushBusy(false);
    }
  };

  const pushMessage = (): string | null => {
    if (pushError)
      return L(
        'Activation impossible pour le moment. Réessayez.',
        'Could not enable notifications right now. Please try again.',
        'No se pudo activar ahora. Inténtalo de nuevo.',
      );
    if (pushState === 'unsupported')
      return needsHomeScreenInstall()
        ? L(
            'Sur iPhone et iPad, ajoutez d’abord CyberSens à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil »), puis revenez ici.',
            'On iPhone and iPad, first add CyberSens to your Home Screen (Share, then “Add to Home Screen”), then come back here.',
            'En iPhone y iPad, añade primero CyberSens a la pantalla de inicio (Compartir y «Añadir a pantalla de inicio») y vuelve aquí.',
          )
        : L(
            'Ce navigateur ne permet pas les notifications en arrière-plan.',
            'This browser does not support background notifications.',
            'Este navegador no admite notificaciones en segundo plano.',
          );
    if (pushState === 'denied')
      return L(
        'Les notifications sont bloquées pour ce site : autorisez-les dans les réglages de votre navigateur, puis revenez ici.',
        'Notifications are blocked for this site: allow them in your browser settings, then come back here.',
        'Las notificaciones están bloqueadas para este sitio: permítelas en los ajustes del navegador y vuelve aquí.',
      );
    if (pushState === 'unconfigured')
      return L(
        'Les notifications ne sont pas encore activées sur ce serveur.',
        'Notifications are not enabled on this server yet.',
        'Las notificaciones aún no están activadas en este servidor.',
      );
    return null;
  };

  const message = pushMessage();
  const canToggle = pushState === 'on' || pushState === 'off';

  return (
    <Card className="p-5 sm:p-6 space-y-5">
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
        <Switch
          on={on}
          label={L('Notifications en direct', 'Live notifications', 'Notificaciones en directo')}
          onClick={() => setLiveNotifications(!on)}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
          <BellOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black">
            {L(
              'Notifications même application fermée',
              'Notifications even when the app is closed',
              'Notificaciones aunque la app esté cerrada',
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Recevez une alerte sur cet appareil pour les publications de la Communauté, les actualités et les nouveautés, sans ouvrir CyberSens. Elles s’arrêtent à la déconnexion.',
              'Get an alert on this device for Community posts, news and new features without opening CyberSens. They stop when you log out.',
              'Recibe una alerta en este dispositivo por publicaciones de la Comunidad, noticias y novedades sin abrir CyberSens. Se detienen al cerrar sesión.',
            )}
          </p>
          {pushState === 'on' && (
            <button
              type="button"
              onClick={() =>
                void showSystemNotification({
                  title: 'CyberSens',
                  body: L(
                    'Test : si vous voyez ceci sur votre écran, les notifications fonctionnent.',
                    'Test: if you can see this on your screen, notifications work.',
                    'Prueba: si ves esto en tu pantalla, las notificaciones funcionan.',
                  ),
                  tag: 'test',
                  force: true,
                })
              }
              className="mt-1.5 text-xs font-bold text-sky-700 underline underline-offset-2 hover:text-sky-600 dark:text-sky-400"
            >
              {L(
                'Envoyer une notification de test',
                'Send a test notification',
                'Enviar una notificación de prueba',
              )}
            </button>
          )}
          {message && (
            <p
              role={pushError ? 'alert' : undefined}
              className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
            >
              {message}
            </p>
          )}
        </div>
        <Switch
          on={pushState === 'on'}
          disabled={!canToggle || pushBusy}
          label={L(
            'Notifications même application fermée',
            'Notifications even when the app is closed',
            'Notificaciones aunque la app esté cerrada',
          )}
          onClick={togglePush}
        />
      </div>
    </Card>
  );
};
