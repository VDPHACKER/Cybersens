import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../services/apiClient';
import { Card, useL } from './ui';

const MIN_LENGTH = 12;

/** Changement du mot de passe du compte : exige l'ancien et ferme les sessions des autres appareils. */
export const PasswordChangeCard: React.FC = () => {
  const L = useL();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<null | { ok: boolean; text: string }>(null);

  const problem = (): string | null => {
    if (next.length < MIN_LENGTH)
      return L(
        `Le nouveau mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`,
        `The new password must be at least ${MIN_LENGTH} characters long.`,
        `La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`,
      );
    if (next !== confirm)
      return L(
        'Les deux mots de passe ne correspondent pas.',
        'The two passwords do not match.',
        'Las dos contraseñas no coinciden.',
      );
    if (next === current)
      return L(
        'Le nouveau mot de passe doit être différent de l’ancien.',
        'The new password must differ from the old one.',
        'La nueva contraseña debe ser distinta de la anterior.',
      );
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = problem();
    if (issue) return setMessage({ ok: false, text: issue });
    setBusy(true);
    setMessage(null);
    try {
      await api('POST', '/api/me/password', { current, next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({
        ok: true,
        text: L(
          'Mot de passe modifié. Vos autres appareils ont été déconnectés.',
          'Password changed. Your other devices have been signed out.',
          'Contraseña cambiada. Sus otros dispositivos se han desconectado.',
        ),
      });
    } catch (err) {
      setMessage({
        ok: false,
        text:
          err instanceof ApiError && err.message
            ? err.message
            : L(
                'Modification impossible. Réessayez plus tard.',
                'Could not change the password. Try again later.',
                'No se pudo cambiar la contraseña. Inténtelo más tarde.',
              ),
      });
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-900 dark:text-white';

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black">
            {L('Changer mon mot de passe', 'Change my password', 'Cambiar mi contraseña')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Vos autres appareils seront déconnectés après le changement.',
              'Your other devices will be signed out after the change.',
              'Sus otros dispositivos se desconectarán tras el cambio.',
            )}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3" noValidate>
        {[
          {
            id: 'pw-current',
            label: L('Mot de passe actuel', 'Current password', 'Contraseña actual'),
            value: current,
            set: setCurrent,
            auto: 'current-password',
          },
          {
            id: 'pw-new',
            label: L('Nouveau mot de passe', 'New password', 'Nueva contraseña'),
            value: next,
            set: setNext,
            auto: 'new-password',
          },
          {
            id: 'pw-confirm',
            label: L('Confirmer', 'Confirm', 'Confirmar'),
            value: confirm,
            set: setConfirm,
            auto: 'new-password',
          },
        ].map((f) => (
          <div key={f.id}>
            <label
              htmlFor={f.id}
              className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300"
            >
              {f.label}
            </label>
            <input
              id={f.id}
              type={show ? 'text' : 'password'}
              autoComplete={f.auto}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              maxLength={128}
              required
              className={input}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? L('Modification…', 'Changing…', 'Cambiando…')
              : L('Modifier le mot de passe', 'Change password', 'Cambiar contraseña')}
          </button>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-pressed={show}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-slate-300 dark:hover:bg-white/10"
          >
            {show ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {show ? L('Masquer', 'Hide', 'Ocultar') : L('Afficher', 'Show', 'Mostrar')}
          </button>
        </div>
      </form>

      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            message.ok
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300'
          }`}
        >
          {message.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          {message.text}
        </p>
      )}
    </Card>
  );
};
