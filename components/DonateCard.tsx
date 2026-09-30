import React from 'react';
import { HeartHandshake, BookOpen, ArrowRight, ExternalLink } from 'lucide-react';
import { useI18n } from '../services/i18n';

// Fiche de don compacte (accueil). Mêmes textes traduits que la page « Faire un don » (features/Donate.tsx).
export const BOOK_URL = 'https://mxildbzj.mychariow.shop/prd_xww4mhs0';

interface Props {
  onLearnMore: () => void;
  className?: string;
}

export const DonateCard: React.FC<Props> = ({ onLearnMore, className = '' }) => {
  const { t } = useI18n();
  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  return (
    <section
      className={`rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600/25 via-ink-800 to-ink-900 p-5 text-white shadow-card ${className}`}
      aria-labelledby="don-titre"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/25 text-emerald-300">
          <HeartHandshake className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            {t('donate.eyebrow', 'Soutenez')}
          </p>
          <h2 id="don-titre" className="text-sm font-black leading-tight">
            {t('donate.book_title', 'La Guerre invisible : IA et cybersécurité')}
          </h2>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-300">
        {t(
          'donate.hook',
          'L’IA peut attaquer… mais elle peut aussi vous aider à vous protéger avant qu’il soit trop tard.',
        )}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-black leading-none">{t('donate.amount', '15 000 FCFA')}</p>
          <p className="mt-1 max-w-[12rem] text-[10px] leading-snug text-slate-400">
            {t('donate.amount_hint', 'Le prix de la connaissance, à l’accessibilité de chacun')}
          </p>
        </div>
        <BookOpen className="h-10 w-10 shrink-0 text-emerald-300/40" aria-hidden="true" />
      </div>

      <a
        href={BOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-sky-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.01] ${ring}`}
      >
        {t('donate.cta', 'Acheter le livre')}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">(nouvel onglet)</span>
      </a>

      <button
        onClick={onLearnMore}
        className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-emerald-200 transition-colors hover:bg-white/5 ${ring}`}
      >
        {t('donate.learn_more', 'En savoir plus')}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <p className="mt-2 text-center text-[10px] text-slate-400">
        {t('donate.reassurance_short', 'Achat sécurisé · soutien direct à CyberSens')}
      </p>
    </section>
  );
};
