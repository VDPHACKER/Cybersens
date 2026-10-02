import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Bot,
  CircleHelp,
  Download,
  Flag,
  Gamepad2,
  HelpCircle,
  House,
  LifeBuoy,
  Newspaper,
  Rocket,
  Search,
  Trophy,
  User,
  Users,
  Wrench,
  ChevronDown,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import { Card, useL } from '../components/ui';
import { GUIDE_SECTIONS, QUICK_START, TROUBLESHOOTING, type Tr } from './Guide/guideContent';

interface GuideProps {
  onBack: () => void;
  /** Ouvre l'écran de connexion ou d'inscription. */
  onEnter: (mode: 'login' | 'register') => void;
}

const ICONS: Record<string, LucideIcon> = {
  home: House,
  learn: BookOpen,
  quiz: HelpCircle,
  ctf: Flag,
  games: Gamepad2,
  tools: Wrench,
  ai: Bot,
  news: Newspaper,
  leaderboard: Trophy,
  community: Users,
  profile: User,
  install: Download,
};

const Guide: React.FC<GuideProps> = ({ onBack, onEnter }) => {
  const { language, t } = useI18n();
  const L = useL();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const tr = (v: Tr) => (language === 'en' ? v.en : language === 'es' ? v.es : v.fr);
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const needle = norm(query.trim());

  const sections = useMemo(
    () =>
      GUIDE_SECTIONS.filter((s) => {
        if (!needle) return true;
        const text = [s.title, s.summary, ...s.steps, ...(s.tips ?? [])]
          .map((v) => `${v.fr} ${v.en} ${v.es}`)
          .join(' ');
        return norm(text).includes(needle);
      }),
    [needle],
  );
  const problems = useMemo(
    () =>
      TROUBLESHOOTING.filter((p) => {
        if (!needle) return true;
        const q = p.question;
        const a = p.answer;
        return norm(`${q.fr} ${q.en} ${q.es} ${a.fr} ${a.en} ${a.es}`).includes(needle);
      }),
    [needle],
  );
  const searching = needle.length > 0;

  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <button
        onClick={onBack}
        className={`flex w-fit items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 transition-colors hover:text-cyan-500 ${ring}`}
      >
        <span className="text-xl">←</span> {t('common.back', 'Retour')}
      </button>

      {/* Bandeau */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-6 text-white shadow-card sm:p-10">
        <LifeBuoy
          className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 text-brand/20 sm:h-72 sm:w-72"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-light">
            {L('Prise en main', 'Getting started', 'Primeros pasos')}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {L('Guide d’utilisation', 'User guide', 'Guía de uso')}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            {L(
              'Tout pour bien démarrer avec CyberSens : où trouver chaque fonctionnalité et comment l’utiliser, pas à pas.',
              'Everything you need to get going with CyberSens: where to find each feature and how to use it, step by step.',
              'Todo para empezar con CyberSens: dónde encontrar cada función y cómo usarla, paso a paso.',
            )}
          </p>
          <label className="relative mt-5 block">
            <span className="sr-only">
              {L('Rechercher dans le guide', 'Search the guide', 'Buscar en la guía')}
            </span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L(
                'Rechercher : quiz, certificat, hors ligne…',
                'Search: quiz, certificate, offline…',
                'Buscar: quiz, certificado, sin conexión…',
              )}
              className={`w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 ${ring}`}
            />
          </label>
        </div>
      </section>

      {/* Démarrage rapide */}
      {!searching && (
        <Card className="p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
            <Rocket className="h-5 w-5 text-brand dark:text-brand-light" aria-hidden="true" />
            {L('Démarrage rapide', 'Quick start', 'Inicio rápido')}
          </h2>
          <ol className="mt-5 space-y-3">
            {QUICK_START.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-black text-brand dark:text-brand-light">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                  {tr(step)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Fonctionnalités */}
      <section aria-labelledby="guide-features" className="space-y-3">
        <h2 id="guide-features" className="px-1 text-xl font-black sm:text-2xl">
          {L('Les fonctionnalités', 'Features', 'Funciones')}
        </h2>
        {sections.length === 0 && problems.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {L(
              'Aucun résultat. Essayez un autre mot.',
              'No results. Try another word.',
              'Sin resultados. Pruebe con otra palabra.',
            )}
          </Card>
        )}
        {sections.map((s) => {
          const Icon = ICONS[s.id] ?? CircleHelp;
          const isOpen = searching || openId === s.id;
          const panelId = `guide-panel-${s.id}`;
          return (
            <Card key={s.id} className="overflow-hidden">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(openId === s.id ? null : s.id)}
                className={`flex w-full items-center gap-3 p-4 text-left sm:p-5 ${ring}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black sm:text-base">{tr(s.title)}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    {tr(s.summary)}
                  </span>
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div
                  id={panelId}
                  className="space-y-4 border-t border-slate-200 p-4 dark:border-white/10 sm:p-5"
                >
                  <ol className="space-y-2.5">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {i + 1}
                        </span>
                        <p className="pt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {tr(step)}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {s.tips?.map((tip, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 sm:text-sm"
                    >
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{tr(tip)}</span>
                    </p>
                  ))}{' '}
                </div>
              )}
            </Card>
          );
        })}
      </section>

      {/* Problèmes courants */}
      {problems.length > 0 && (
        <section aria-labelledby="guide-faq" className="space-y-3">
          <h2 id="guide-faq" className="px-1 text-xl font-black sm:text-2xl">
            {L('Problèmes courants', 'Common problems', 'Problemas comunes')}
          </h2>
          <Card className="divide-y divide-slate-200 dark:divide-white/10">
            {problems.map((p) => (
              <details key={p.id} className="group p-4 sm:p-5" open={searching}>
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black sm:text-base ${ring}`}
                >
                  {tr(p.question)}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {tr(p.answer)}
                </p>
              </details>
            ))}
          </Card>
        </section>
      )}

      <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {L(
            'Prêt à essayer ? Créez votre compte gratuit en une minute.',
            'Ready to try it? Create your free account in a minute.',
            '¿Listo para probar? Cree su cuenta gratis en un minuto.',
          )}
        </p>
        <button
          type="button"
          onClick={() => onEnter('register')}
          className={`inline-flex items-center gap-2 rounded-xl border border-brand/40 px-4 py-2 text-sm font-black text-brand transition-colors hover:bg-brand/10 dark:text-brand-light ${ring}`}
        >
          {L('Créer un compte', 'Sign up', 'Crear cuenta')}
        </button>
      </Card>
    </div>
  );
};

export default Guide;
