import React, { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { api, ApiError } from '../services/apiClient';
import { clearUserCache } from '../services/persistenceService';
import { Card, useL } from './ui';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-900 dark:text-white';

/** Droits sur les données personnelles : téléchargement d'une copie (JSON) et suppression définitive du compte. */
export const AccountDataCard: React.FC = () => {
  const L = useL();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const fail = (err: unknown) =>
    setMessage(
      err instanceof ApiError && err.message
        ? err.message
        : L(
            'Opération impossible. Réessayez plus tard.',
            'Operation failed. Try again later.',
            'Operación imposible. Inténtelo más tarde.',
          ),
    );

  const download = async () => {
    setBusy('export');
    setMessage(null);
    try {
      const data = await api('GET', '/api/me/export');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cybersens-mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('delete');
    setMessage(null);
    try {
      await api('POST', '/api/me/delete', { password });
      clearUserCache();
      window.location.assign('/');
    } catch (err) {
      fail(err);
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black">{L('Mes données', 'My data', 'Mis datos')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Téléchargez une copie de vos données ou supprimez définitivement votre compte.',
              'Download a copy of your data or permanently delete your account.',
              'Descargue una copia de sus datos o elimine definitivamente su cuenta.',
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {busy === 'export'
            ? L('Préparation…', 'Preparing…', 'Preparando…')
            : L('Télécharger mes données', 'Download my data', 'Descargar mis datos')}
        </button>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-xl px-5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            {L('Supprimer mon compte', 'Delete my account', 'Eliminar mi cuenta')}
          </button>
        )}
      </div>

      {confirming && (
        <form onSubmit={remove} className="mt-4 grid gap-3 sm:max-w-md" noValidate>
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            {L(
              'Action définitive : votre profil, vos points, certificats, messages et avis seront effacés et ne pourront pas être récupérés. Saisissez votre mot de passe pour confirmer.',
              'This is permanent: your profile, points, certificates, posts and reviews will be erased and cannot be recovered. Enter your password to confirm.',
              'Acción definitiva: su perfil, puntos, certificados, mensajes y opiniones se borrarán y no podrán recuperarse. Introduzca su contraseña para confirmar.',
            )}
          </p>
          <div>
            <label
              htmlFor="delete-password"
              className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300"
            >
              {L('Mot de passe', 'Password', 'Contraseña')}
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              required
              className={inputClass}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy !== null || !password}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {busy === 'delete'
                ? L('Suppression…', 'Deleting…', 'Eliminando…')
                : L('Supprimer définitivement', 'Delete permanently', 'Eliminar definitivamente')}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setPassword('');
                setMessage(null);
              }}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {L('Annuler', 'Cancel', 'Cancelar')}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {message}
        </p>
      )}
    </Card>
  );
};
