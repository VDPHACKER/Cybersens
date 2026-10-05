import React from 'react';
import { Star } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { useL } from '../components/ui';
import type { ReviewsOverview } from '../services/reviewsApi';
import { membersLabel } from '../services/reviewsFormat';

export const Stars: React.FC<{ value: number; className?: string }> = ({
  value,
  className = 'h-4 w-4',
}) => (
  <span className="inline-flex" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${className} ${
          n <= Math.round(value)
            ? 'fill-amber-400 text-amber-400'
            : 'text-slate-300 dark:text-slate-600'
        }`}
      />
    ))}
  </span>
);

/** Section « Ce que disent nos utilisateurs » de l'accueil : invisible tant qu'il n'y a aucun avis. */
export const ReviewsSection: React.FC<{ overview: ReviewsOverview }> = ({ overview }) => {
  const L = useL();
  const { language } = useI18n();
  if (overview.count === 0) return null;
  const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';

  return (
    <section
      aria-labelledby="reviews-title"
      className="px-4 sm:px-8 pb-16 sm:pb-24 max-w-6xl mx-auto"
    >
      <h2 id="reviews-title" className="text-center text-2xl sm:text-3xl font-black tracking-tight">
        {L(
          'Ce que disent nos utilisateurs',
          'What our users say',
          'Lo que dicen nuestros usuarios',
        )}
      </h2>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
        <Stars value={overview.average} className="h-5 w-5" />
        <span className="font-black">{overview.average.toLocaleString(locale)}/5</span>
        <span>
          {L(
            `${overview.count} avis`,
            `${overview.count} review${overview.count > 1 ? 's' : ''}`,
            `${overview.count} opinion${overview.count > 1 ? 'es' : ''}`,
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span>{membersLabel(overview.members, language)}</span>
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overview.reviews.map((r) => (
          <li
            key={r.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <Stars value={r.rating} />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {new Date(r.createdAt).toLocaleDateString(locale)}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {r.body}
            </p>
            <p className="mt-3 text-xs font-black text-slate-900 dark:text-white">
              {r.author}
              <span className="ml-2 font-semibold text-slate-500 dark:text-slate-400">
                {L('Niveau', 'Level', 'Nivel')} {r.authorLevel}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
