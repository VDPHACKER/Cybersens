import React from 'react';
import { useI18n } from '../services/i18n';

// Éléments d'interface partagés (style de la maquette « UI UX ») : cartes, en-têtes, états vides/erreur.

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-card dark:border-white/10 dark:bg-ink-800/80 dark:text-slate-100 ${className}`}
    {...rest}
  >
    {children}
  </div>
);

/**
 * Cadre sombre pour les écrans « arène » (CTF, mini-jeux), conçus pour un fond sombre.
 * Il garantit un contraste correct en mode clair comme en mode sombre.
 */
export const ArenaSurface: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <div
    className={`rounded-3xl border border-slate-800 bg-ink-950 p-4 text-slate-100 shadow-card sm:p-6 lg:p-8 ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export const PageHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ icon, title, subtitle, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
        )}
      </div>
    </div>
    {actions}
  </div>
);

export const StateBox: React.FC<{
  kind: 'loading' | 'error' | 'empty';
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}> = ({ kind, title, hint, action }) => (
  <Card
    className="flex flex-col items-center gap-2 px-6 py-10 text-center"
    role={kind === 'error' ? 'alert' : 'status'}
  >
    {kind === 'loading' && (
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent"
        aria-hidden="true"
      />
    )}
    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
    {hint && <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2"
      >
        {action.label}
      </button>
    )}
  </Card>
);

/** Petite fonction de choix de langue pour les libellés propres aux nouveaux écrans. */
export const useL = () => {
  const { language } = useI18n();
  return (fr: string, en: string, es: string) =>
    language === 'en' ? en : language === 'es' ? es : fr;
};

/** « il y a 5 min » dans la langue courante. */
export const useRelativeTime = () => {
  const { language } = useI18n();
  const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  return (iso: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
      minutes < 1
        ? [0, 'minute']
        : minutes < 60
          ? [minutes, 'minute']
          : minutes < 1440
            ? [Math.round(minutes / 60), 'hour']
            : [Math.round(minutes / 1440), 'day'];
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-value, unit);
  };
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
];
export const Avatar: React.FC<{ name: string; className?: string }> = ({
  name,
  className = 'h-10 w-10 text-sm',
}) => {
  const color =
    AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-black text-white ${color} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
};
