import React, { useState } from 'react';
import { resendEmailConfirmation } from '../services/authService';
import { useI18n } from '../services/i18n';

interface Props {
  /** Résultat du lien ouvert depuis l'e-mail ; absent si on n'arrive pas d'un lien */
  linkResult?: 'ok' | 'invalid' | null;
  /** Adresse en attente de confirmation (affiche le bandeau d'invitation) */
  pending: boolean;
  onDismissResult: () => void;
}

/** Bandeau de confirmation d'e-mail : résultat du lien ouvert, ou invitation à confirmer avec renvoi du lien. */
const EmailVerificationBanner: React.FC<Props> = ({ linkResult, pending, onDismissResult }) => {
  const { t, language } = useI18n();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (linkResult) {
    const ok = linkResult === 'ok';
    return (
      <div
        role="status"
        className={`mx-auto mb-4 flex max-w-5xl items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs font-semibold ${
          ok
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
        }`}
      >
        <span>
          {ok
            ? t('app.verify.ok', 'Adresse e-mail confirmée, merci !')
            : t(
                'app.verify.invalid',
                'Lien invalide ou expiré. Utilisez « Renvoyer le lien » depuis votre compte.',
              )}
        </span>
        <button onClick={onDismissResult} className="underline">
          {t('app.verify.dismiss', 'Fermer')}
        </button>
      </div>
    );
  }
  if (!pending) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await resendEmailConfirmation(language);
      setSent(true);
    } catch {
      setSent(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span>
        {sent
          ? t('app.verify.sent', 'Lien envoyé, vérifiez votre boîte de réception.')
          : t(
              'app.verify.pending',
              'Confirmez votre adresse e-mail : un lien vous a été envoyé. Tant qu’elle n’est pas confirmée, certaines fonctions restent limitées.',
            )}
      </span>
      {!sent && (
        <button
          onClick={resend}
          disabled={busy}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-white disabled:opacity-60"
        >
          {t('app.verify.resend', 'Renvoyer le lien')}
        </button>
      )}
    </div>
  );
};

export default EmailVerificationBanner;
