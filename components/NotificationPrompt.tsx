import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { enablePush, getPushState, pushSupported } from '../services/pushNotifications';
import { PROMPT_SNOOZE_MS, shouldOfferPush, type PermissionState } from '../services/pushPrompt';
import { showSystemNotification } from '../services/systemNotification';
import { useL } from './ui';

const SNOOZE_KEY = 'cybersens_push_prompt_until';
const SHOW_DELAY_MS = 4000; // laisse l'utilisateur arriver avant de lui demander quoi que ce soit

const readSnooze = (): number | null => {
  try {
    const value = Number(localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const writeSnooze = (until: number) => {
  try {
    localStorage.setItem(SNOOZE_KEY, String(until));
  } catch {
    /* stockage indisponible : l'invitation reviendra à la prochaine session */
  }
};

/**
 * Invitation à recevoir les notifications sur l'appareil (centre de notifications du système),
 * même application fermée. Affichée une fois la session ouverte ; « Plus tard » la repousse d'une semaine.
 */
export const NotificationPrompt: React.FC = () => {
  const L = useL();
  const { language } = useI18n();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const state = await getPushState();
      if (cancelled) return;
      const offer = shouldOfferPush({
        supported: state !== 'unsupported',
        permission: Notification.permission as PermissionState,
        enabled: state === 'on',
        snoozedUntil: readSnooze(),
        now: Date.now(),
      });
      if (offer) setVisible(true);
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const later = () => {
    writeSnooze(Date.now() + PROMPT_SNOOZE_MS);
    setVisible(false);
  };

  const activate = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const state = await enablePush(language);
      if (state === 'on') {
        setVisible(false);
        // Confirmation immédiate : l'utilisateur voit tout de suite à quoi ressemblent les alertes
        void showSystemNotification({
          title: 'CyberSens',
          body: L(
            'Notifications activées : vous serez prévenu ici des nouveautés.',
            'Notifications enabled: you will be alerted here about news.',
            'Notificaciones activadas: aquí recibirás los avisos.',
          ),
          url: '/',
          tag: 'welcome',
          force: true,
        });
      } else {
        setFailed(true);
        writeSnooze(Date.now() + PROMPT_SNOOZE_MS);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={L('Activer les notifications', 'Enable notifications', 'Activar notificaciones')}
      className="fixed inset-x-4 bottom-24 z-[96] rounded-2xl border border-sky-200 bg-white p-4 shadow-2xl dark:border-sky-900/60 dark:bg-slate-900 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            {L('Activer les notifications', 'Turn on notifications', 'Activar las notificaciones')}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {L(
              'Activez les notifications pour être prévenu des nouveaux messages de la Communauté, des actualités et des nouveautés. Sur mobile, une autorisation vous sera demandée.',
              'Turn on notifications to be alerted about new Community posts, news and new features. On mobile, you will be asked for permission.',
              'Activa las notificaciones para recibir avisos de nuevas publicaciones de la Comunidad, noticias y novedades. En el móvil se te pedirá una autorización.',
            )}
          </p>
          {failed && (
            <p
              role="alert"
              className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
            >
              {L(
                'Autorisation non accordée. Vous pourrez l’activer plus tard dans Profil, ou dans les réglages du navigateur.',
                'Permission not granted. You can enable it later in Profile, or in your browser settings.',
                'Permiso no concedido. Puedes activarlo más tarde en Perfil o en los ajustes del navegador.',
              )}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {failed ? (
              <button
                onClick={() => setVisible(false)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-black text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100"
              >
                OK
              </button>
            ) : (
              <>
                <button
                  onClick={activate}
                  disabled={busy}
                  className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {L('Activer', 'Enable', 'Activar')}
                </button>
                <button
                  onClick={later}
                  disabled={busy}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {L('Plus tard', 'Later', 'Más tarde')}
                </button>
              </>
            )}
          </div>
        </div>
        <button
          onClick={later}
          aria-label={L('Fermer', 'Close', 'Cerrar')}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
