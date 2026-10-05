import React, { useEffect, useState } from 'react';
import { MessageSquareHeart, Star } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { deleteMyReview, fetchMyReview, saveMyReview } from '../services/reviewsApi';
import { Card, useL } from './ui';

const MIN = 10;
const MAX = 500;

/** Profil : l'utilisateur écrit, modifie ou supprime son avis (affiché sur l'accueil public). */
export const MyReviewCard: React.FC = () => {
  const L = useL();
  const [loaded, setLoaded] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<null | { ok: boolean; text: string }>(null);

  useEffect(() => {
    fetchMyReview()
      .then(({ review }) => {
        if (review) {
          setHasReview(true);
          setRating(review.rating);
          setBody(review.body);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const fail = (err: unknown) =>
    setMessage({
      ok: false,
      text:
        err instanceof ApiError && err.message
          ? err.message
          : L(
              'Action impossible. Réessayez plus tard.',
              'Action failed. Try again later.',
              'Acción imposible. Inténtelo más tarde.',
            ),
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1)
      return setMessage({
        ok: false,
        text: L(
          'Choisissez une note de 1 à 5.',
          'Pick a rating from 1 to 5.',
          'Elige una nota del 1 al 5.',
        ),
      });
    if (body.trim().length < MIN)
      return setMessage({
        ok: false,
        text: L(
          `Votre avis doit contenir au moins ${MIN} caractères.`,
          `Your review must be at least ${MIN} characters long.`,
          `Tu opinión debe tener al menos ${MIN} caracteres.`,
        ),
      });
    setBusy(true);
    setMessage(null);
    try {
      await saveMyReview(rating, body);
      setHasReview(true);
      setMessage({
        ok: true,
        text: L(
          'Merci ! Votre avis est publié.',
          'Thank you! Your review is published.',
          '¡Gracias! Tu opinión está publicada.',
        ),
      });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await deleteMyReview();
      setHasReview(false);
      setRating(0);
      setBody('');
      setMessage({
        ok: true,
        text: L(
          'Votre avis a été supprimé.',
          'Your review has been deleted.',
          'Tu opinión ha sido eliminada.',
        ),
      });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
          <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black">
            {L('Mon avis sur CyberSens', 'My review of CyberSens', 'Mi opinión sobre CyberSens')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Affiché sur la page d’accueil avec votre prénom et l’initiale de votre nom.',
              'Shown on the home page with your first name and last initial.',
              'Se muestra en la página de inicio con tu nombre y la inicial del apellido.',
            )}
          </p>
        </div>
      </div>

      {loaded && (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <div role="radiogroup" aria-label={L('Note', 'Rating', 'Nota')} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}/5`}
                onClick={() => setRating(n)}
                className="rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Star
                  className={`h-7 w-7 ${
                    n <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="my-review" className="sr-only">
              {L('Votre avis', 'Your review', 'Tu opinión')}
            </label>
            <textarea
              id="my-review"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX}
              rows={4}
              placeholder={L(
                'Ce qui vous a plu, ce que vous avez appris…',
                'What you liked, what you learned…',
                'Lo que te gustó, lo que aprendiste…',
              )}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-900 dark:text-white"
            />
            <p className="mt-1 text-right text-[11px] text-slate-500 dark:text-slate-400">
              {body.length}/{MAX}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {hasReview
                ? L('Mettre à jour mon avis', 'Update my review', 'Actualizar mi opinión')
                : L('Publier mon avis', 'Publish my review', 'Publicar mi opinión')}
            </button>
            {hasReview && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {L('Supprimer', 'Delete', 'Eliminar')}
              </button>
            )}
            {message && (
              <p
                role="status"
                className={`text-xs font-semibold ${
                  message.ok
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
      )}
    </Card>
  );
};
