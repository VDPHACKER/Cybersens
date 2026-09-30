import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  BookOpen,
  HelpCircle,
  Flag,
  Gamepad2,
  Wrench,
  Bot,
  Trophy,
  Users,
  KeyRound,
  Link2,
  MailWarning,
  ScanSearch,
  ScanFace,
  ClipboardList,
  Newspaper,
  Shield,
  Lock,
  AlertTriangle,
  Share2,
  Smartphone,
  Building2,
  Cpu,
  Terminal,
  Award,
  Medal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { AppTab, CourseModule } from '../types';
import { useI18n } from '../services/i18n';
import { getCourseModules, getLocalizedNewsArticles } from '../services/learningContent';
import {
  getPreferences,
  getCertificates,
  getCompletedLessons,
  getDynamicBadges,
} from '../services/persistenceService';
import { CHALLENGE_FACTORIES } from './CTF/ctfGenerator';
import { Avatar, useL, useRelativeTime } from '../components/ui';
import { DonateCard } from '../components/DonateCard';

interface HomeProps {
  onStart: (tab: AppTab) => void;
}

const MODULE_ICONS: Record<string, LucideIcon> = {
  Shield,
  Lock,
  AlertTriangle,
  Share2,
  Smartphone,
  Building2,
  Cpu,
  Terminal,
  Search: ScanSearch,
};
const MODULE_GRADIENTS = [
  'from-blue-500 to-blue-800',
  'from-cyan-500 to-blue-700',
  'from-violet-500 to-indigo-800',
  'from-emerald-500 to-teal-800',
  'from-rose-500 to-red-800',
  'from-amber-500 to-orange-700',
];

interface LiveItem {
  id: string;
  title: string;
  source: string;
  publishedAt?: string;
  fallbackAgo?: string;
  lang?: string;
}

const HeroArt: React.FC = () => (
  <svg
    viewBox="0 0 320 320"
    className="h-full w-full"
    role="img"
    aria-label="Bouclier de cybersécurité"
  >
    <defs>
      <radialGradient id="glow" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <circle cx="160" cy="150" r="140" fill="url(#glow)" />
    <g fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1">
      <circle cx="160" cy="150" r="118" strokeDasharray="4 8" />
      <circle cx="160" cy="150" r="92" />
    </g>
    <path
      d="M160 40 L246 74 V146 C246 205 208 246 160 268 C112 246 74 205 74 146 V74 Z"
      fill="url(#shield)"
      fillOpacity="0.28"
      stroke="#93c5fd"
      strokeWidth="3"
    />
    <path
      d="M160 62 L228 89 V146 C228 194 199 228 160 247 C121 228 92 194 92 146 V89 Z"
      fill="#0b1b4d"
      fillOpacity="0.7"
      stroke="#60a5fa"
      strokeWidth="1.5"
    />
    <rect x="132" y="138" width="56" height="46" rx="8" fill="#e0f2fe" />
    <path
      d="M142 138 v-14 a18 18 0 0 1 36 0 v14"
      fill="none"
      stroke="#e0f2fe"
      strokeWidth="9"
      strokeLinecap="round"
    />
    <circle cx="160" cy="158" r="6" fill="#1d4ed8" />
    <rect x="157" y="160" width="6" height="14" rx="3" fill="#1d4ed8" />
    <g fill="#67e8f9">
      <circle cx="58" cy="96" r="3" />
      <circle cx="268" cy="118" r="2.5" />
      <circle cx="240" cy="236" r="3" />
      <circle cx="80" cy="232" r="2.5" />
    </g>
  </svg>
);

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  const { language } = useI18n();
  const L = useL();
  const timeAgo = useRelativeTime();
  const prefs = getPreferences();
  const certificates = getCertificates();
  const modules = getCourseModules(language);
  const [news, setNews] = useState<LiveItem[]>(() =>
    getLocalizedNewsArticles(language)
      .slice(0, 4)
      .map((a) => ({ id: a.id, title: a.title, source: a.author, fallbackAgo: a.timeAgo })),
  );
  const [newsLive, setNewsLive] = useState(false);

  // Actualités en direct (flux RSS agrégés par le serveur) ; repli sur les articles locaux
  useEffect(() => {
    let cancelled = false;
    fetch('/api/news')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('news'))))
      .then((data: { articles: (LiveItem & { lang: string })[] }) => {
        const wanted = language === 'fr' ? 'fr' : 'en';
        const preferred = data.articles.filter((a) => a.lang === wanted);
        const items = (preferred.length >= 3 ? preferred : data.articles).slice(0, 4);
        if (!cancelled && items.length) {
          setNews(items);
          setNewsLive(true);
        }
      })
      .catch(() => {
        /* on garde les articles locaux */
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const stats = useMemo(() => {
    const done = (m: CourseModule) =>
      getCompletedLessons(m.id).filter((id) => m.lessons.some((l) => l.id === id)).length;
    const perModule = modules.map((m) => {
      const completed = done(m);
      const total = m.lessons.length;
      const certified = certificates.some((c) => c.courseId === m.id);
      return {
        module: m,
        completed,
        total,
        percent: certified ? 100 : total ? Math.round((completed / total) * 100) : 0,
      };
    });
    return {
      perModule,
      lessonsTotal: modules.reduce((s, m) => s + m.lessons.length, 0),
      lessonsDone: perModule.reduce((s, p) => s + p.completed, 0),
    };
  }, [modules, certificates]);

  const inProgress = stats.perModule.filter((p) => p.percent > 0 && p.percent < 100);
  const notStarted = stats.perModule.filter((p) => p.percent === 0);
  const featured = [
    ...inProgress,
    ...notStarted,
    ...stats.perModule.filter((p) => p.percent === 100),
  ].slice(0, 3);
  const resume = featured[0];

  const openCourse = (moduleId?: string) => {
    try {
      if (moduleId) sessionStorage.setItem('cybersens-open-course', moduleId);
    } catch {
      /* stockage indisponible */
    }
    onStart(AppTab.LEARN);
  };
  const openTool = (id: string) => {
    try {
      sessionStorage.setItem('cybersens-open-tool', id);
    } catch {
      /* stockage indisponible */
    }
    onStart(AppTab.TOOLS);
  };

  const points = prefs.points ?? 0;
  const level = prefs.level ?? Math.max(1, Math.floor(points / 200) + 1);
  const xpInLevel = points % 200;
  const badges = getDynamicBadges().filter((b) => b.unlocked).length;
  const firstName = (prefs.userName || '').split(' ')[0];
  const ctfCount = Object.keys(CHALLENGE_FACTORIES).length;
  const GAMES = 9;
  const TOOLS = 6;

  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  const moduleNumber = (m: CourseModule) => m.id.replace(/\D/g, '') || '';
  const ctaLabel = (percent: number) =>
    percent === 0
      ? L('Commencer', 'Start', 'Empezar')
      : percent === 100
        ? L('Revoir', 'Review', 'Repasar')
        : L('Continuer', 'Continue', 'Continuar');

  const tiles: { tab: AppTab; title: string; desc: string; icon: LucideIcon; tone: string }[] = [
    {
      tab: AppTab.QUIZ,
      title: 'Quiz',
      desc: L(
        'Entraîne-toi et teste tes connaissances',
        'Practice and test your knowledge',
        'Practica y pon a prueba tus conocimientos',
      ),
      icon: HelpCircle,
      tone: 'from-violet-600 to-indigo-800',
    },
    {
      tab: AppTab.CTF,
      title: L('Arène CTF', 'CTF Arena', 'Arena CTF'),
      desc: L(
        `${ctfCount} défis à drapeaux générés aléatoirement`,
        `${ctfCount} challenges with random flags`,
        `${ctfCount} retos con banderas aleatorias`,
      ),
      icon: Flag,
      tone: 'from-rose-600 to-red-800',
    },
    {
      tab: AppTab.GAMES,
      title: L('Mini-jeux', 'Mini-games', 'Minijuegos'),
      desc: L(
        `${GAMES} jeux pour apprendre en s’amusant`,
        `${GAMES} games to learn while having fun`,
        `${GAMES} juegos para aprender jugando`,
      ),
      icon: Gamepad2,
      tone: 'from-orange-500 to-amber-700',
    },
  ];

  const tools: { id: string; title: string; desc: string; icon: LucideIcon; tone: string }[] = [
    {
      id: 'password',
      title: L('Testeur de mot de passe', 'Password tester', 'Medidor de contraseñas'),
      desc: L(
        'Évalue la robustesse de vos mots de passe',
        'Rates your password strength',
        'Evalúa la robustez de tus contraseñas',
      ),
      icon: KeyRound,
      tone: 'bg-emerald-100 text-emerald-600',
    },
    {
      id: 'links',
      title: L('Analyseur de liens', 'Link checker', 'Comprobador de enlaces'),
      desc: L(
        'Vérifie la fiabilité des URL',
        'Checks how trustworthy a URL is',
        'Comprueba la fiabilidad de las URL',
      ),
      icon: Link2,
      tone: 'bg-sky-100 text-sky-600',
    },
    {
      id: 'email',
      title: L('Analyseur d’e-mails', 'Email scanner', 'Escáner de correos'),
      desc: L(
        'Détecte les menaces dans vos e-mails',
        'Detects threats in your emails',
        'Detecta amenazas en tus correos',
      ),
      icon: MailWarning,
      tone: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'analyzer',
      title: L('Audit de logs IA', 'AI log audit', 'Auditoría de logs IA'),
      desc: L(
        'Analysez vos journaux de sécurité',
        'Analyse your security logs',
        'Analiza tus registros de seguridad',
      ),
      icon: ScanSearch,
      tone: 'bg-indigo-100 text-indigo-600',
    },
    {
      id: 'deepfake',
      title: L('Détecteur de deepfake', 'Deepfake detector', 'Detector de deepfakes'),
      desc: L(
        'Repère les contenus générés par IA',
        'Spots AI-generated content',
        'Detecta contenido generado por IA',
      ),
      icon: ScanFace,
      tone: 'bg-violet-100 text-violet-600',
    },
    {
      id: 'audit',
      title: L('Journal d’audit', 'System logs', 'Registros'),
      desc: L(
        'Consultez l’historique de vos analyses',
        'Review your analysis history',
        'Consulta el historial de análisis',
      ),
      icon: ClipboardList,
      tone: 'bg-amber-100 text-amber-600',
    },
  ];

  const newsAgo = (n: LiveItem) => (n.publishedAt ? timeAgo(n.publishedAt) : n.fallbackAgo || '');

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* ===== Mobile / PWA : accueil compact ===== */}
      <section className="space-y-4 lg:hidden" aria-label={L('Accueil', 'Home', 'Inicio')}>
        <div>
          <h1 className="text-2xl font-black">
            {L('Bonjour', 'Hello', 'Hola')} {firstName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Continue ta progression en cybersécurité',
              'Keep going with your cybersecurity progress',
              'Continúa tu progreso en ciberseguridad',
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card dark:bg-ink-800/80">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white"
            aria-label={`${L('Niveau', 'Level', 'Nivel')} ${level}`}
          >
            {level}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span>
                {L('Niveau', 'Level', 'Nivel')} {level}
              </span>
              <span>{xpInLevel} / 200 XP</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-ink-700"
              role="progressbar"
              aria-valuenow={xpInLevel}
              aria-valuemin={0}
              aria-valuemax={200}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-brand"
                style={{ width: `${(xpInLevel / 200) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              tab: AppTab.LEARN,
              title: L('Formations', 'Courses', 'Formaciones'),
              sub: `${modules.length} ${L('modules', 'modules', 'módulos')}`,
              icon: BookOpen,
              tone: 'bg-emerald-100 text-emerald-600',
            },
            {
              tab: AppTab.QUIZ,
              title: 'Quiz',
              sub: L('Solo', 'Solo', 'Solo'),
              icon: HelpCircle,
              tone: 'bg-violet-100 text-violet-600',
            },
            {
              tab: AppTab.CTF,
              title: 'CTF',
              sub: `${ctfCount} ${L('défis', 'challenges', 'retos')}`,
              icon: Flag,
              tone: 'bg-rose-100 text-rose-600',
            },
            {
              tab: AppTab.GAMES,
              title: L('Mini-jeux', 'Mini-games', 'Minijuegos'),
              sub: `${GAMES} ${L('jeux', 'games', 'juegos')}`,
              icon: Gamepad2,
              tone: 'bg-amber-100 text-amber-600',
            },
            {
              tab: AppTab.TOOLS,
              title: L('Outils', 'Tools', 'Útiles'),
              sub: `${TOOLS} ${L('outils', 'tools', 'herramientas')}`,
              icon: Wrench,
              tone: 'bg-sky-100 text-sky-600',
            },
            {
              tab: AppTab.AI_CHAT,
              title: L('Assistant IA', 'AI assistant', 'Asistente IA'),
              sub: 'Gemini',
              icon: Bot,
              tone: 'bg-indigo-100 text-indigo-600',
            },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.title}
                onClick={() => onStart(t.tab)}
                className={`flex items-center gap-3 rounded-2xl bg-white p-3 text-left text-slate-900 shadow-card transition-transform active:scale-[0.98] ${ring}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{t.title}</span>
                  <span className="block truncate text-[11px] text-slate-500">{t.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
        {resume && (
          <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-card">
            <p className="text-xs font-black">
              {L('Formation en cours', 'Course in progress', 'Formación en curso')}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${MODULE_GRADIENTS[0]} text-white`}
              >
                {React.createElement(MODULE_ICONS[resume.module.icon] ?? Shield, {
                  className: 'h-7 w-7',
                  'aria-hidden': true,
                })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-black leading-tight">
                  {resume.module.title}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${resume.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {resume.completed}/{resume.total} {L('leçons', 'lessons', 'lecciones')}
                </p>
              </div>
            </div>
            <button
              onClick={() => openCourse(resume.module.id)}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark ${ring}`}
            >
              {ctaLabel(resume.percent)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* ===== Bureau : tableau de bord ===== */}
      <section
        className="relative hidden overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-8 text-white shadow-card lg:block"
        aria-label={L('Bienvenue', 'Welcome', 'Bienvenida')}
      >
        <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_13rem] xl:grid-cols-[minmax(0,1fr)_15rem_12rem]">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black tracking-tight">
              {L('Bienvenue sur', 'Welcome to', 'Bienvenido a')}{' '}
              <span className="text-brand-light">CyberSens</span>
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-300">
              {L(
                'Apprends, pratique et renforce tes compétences en cybersécurité grâce à des contenus interactifs, des défis réels et des outils puissants.',
                'Learn, practice and strengthen your cybersecurity skills with interactive content, real challenges and powerful tools.',
                'Aprende, practica y refuerza tus habilidades de ciberseguridad con contenidos interactivos, retos reales y herramientas potentes.',
              )}
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-4 gap-y-3">
              {[
                [modules.length, L('Modules', 'Modules', 'Módulos')],
                [stats.lessonsTotal, L('Leçons', 'Lessons', 'Lecciones')],
                [ctfCount, L('Défis CTF', 'CTF challenges', 'Retos CTF')],
                [GAMES, L('Mini-jeux', 'Mini-games', 'Minijuegos')],
                [TOOLS, L('Outils', 'Tools', 'Herramientas')],
                [3, L('Langues', 'Languages', 'Idiomas')],
              ].map(([n, label], i) => (
                <div key={i} className="border-white/15 pr-4 [&:not(:last-child)]:border-r">
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-2xl font-black leading-none">{n}</dd>
                  <dd className="mt-1 text-xs text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => openCourse(resume?.module.id)}
              className={`mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-black text-slate-900 shadow-lg transition-colors hover:bg-gold-dark ${ring}`}
            >
              {resume && resume.percent > 0
                ? L('Reprendre ma formation', 'Resume my course', 'Reanudar mi formación')
                : L('Commencer ma formation', 'Start my course', 'Empezar mi formación')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div
            className="hidden h-52 w-52 justify-self-center lg:block xl:h-60 xl:w-60"
            aria-hidden="true"
          >
            <HeroArt />
          </div>
          <div className="relative z-10 hidden self-center xl:block">
            <p className="text-sm font-black uppercase leading-tight tracking-wide text-brand-light">
              {L('Cybersécurité', 'Cybersecurity', 'Ciberseguridad')}
              <br />
              {L('pour tous', 'for everyone', 'para todos')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {[
                L('Particuliers', 'Individuals', 'Particulares'),
                L('Étudiants', 'Students', 'Estudiantes'),
                L('Professionnels', 'Professionals', 'Profesionales'),
                L('Entreprises', 'Companies', 'Empresas'),
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-white/15">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {/* Vos parcours */}
          <section
            className="rounded-2xl bg-white p-5 text-slate-900 shadow-card"
            aria-labelledby="parcours"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="parcours" className="flex items-center gap-2 text-lg font-black">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-800 text-white">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                </span>
                {L('Vos parcours', 'Your paths', 'Tus rutas')}
              </h2>
              <button
                onClick={() => onStart(AppTab.LEARN)}
                className={`inline-flex items-center gap-1 rounded-lg text-xs font-bold text-brand hover:underline ${ring}`}
              >
                {L('Voir tous les modules', 'See all modules', 'Ver todos los módulos')}{' '}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {featured.map((p, i) => {
                const Icon = MODULE_ICONS[p.module.icon] ?? Shield;
                return (
                  <article
                    key={p.module.id}
                    className="flex flex-col rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${MODULE_GRADIENTS[i % MODULE_GRADIENTS.length]} text-white`}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-brand">
                          Module {moduleNumber(p.module)}
                        </p>
                        <h3 className="line-clamp-2 text-sm font-black leading-tight">
                          {p.module.title}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
                        role="progressbar"
                        aria-valuenow={p.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={p.module.title}
                      >
                        <div
                          className={`h-full rounded-full ${p.percent === 100 ? 'bg-emerald-500' : 'bg-brand'}`}
                          style={{ width: `${p.percent}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[11px] text-slate-500">
                        {p.completed}/{p.total} {L('leçons', 'lessons', 'lecciones')}
                      </span>
                      {p.percent === 100 && (
                        <Check
                          className="h-4 w-4 rounded-full bg-emerald-500 p-0.5 text-white"
                          aria-label={L('Terminé', 'Completed', 'Completado')}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => openCourse(p.module.id)}
                      className={`mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark ${ring}`}
                    >
                      {ctaLabel(p.percent)}{' '}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Tuiles d'activités */}
          <div className="grid grid-cols-4 gap-4">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.title}
                  onClick={() => onStart(t.tab)}
                  className={`flex min-h-[11rem] flex-col items-start justify-between rounded-2xl bg-gradient-to-br ${t.tone} p-4 text-left text-white shadow-card transition-transform hover:-translate-y-0.5 ${ring}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-lg font-black leading-tight">{t.title}</span>
                    <span className="mt-1 block text-xs leading-snug text-white/80">{t.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
            {/* Outils */}
            <section
              className="rounded-2xl bg-white p-5 text-slate-900 shadow-card"
              aria-labelledby="outils"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="outils" className="flex items-center gap-2 text-base font-black">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-800 text-white">
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {L('Outils de sécurité', 'Security tools', 'Herramientas de seguridad')}
                </h2>
                <button
                  onClick={() => onStart(AppTab.TOOLS)}
                  className={`rounded-lg text-xs font-bold text-brand hover:underline ${ring}`}
                >
                  {L('Voir tous les outils', 'See all tools', 'Ver todas')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-2">
                {tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTool(t.id)}
                      className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-brand hover:bg-slate-50 ${ring}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.tone}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-black leading-tight">
                          {t.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                          {t.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Actualités */}
            <NewsCard
              news={news}
              live={newsLive}
              ago={newsAgo}
              onOpen={() => onStart(AppTab.NEWS)}
              L={L}
            />
          </div>
        </div>

        {/* Colonne de droite */}
        <aside className="space-y-6">
          <section
            className="rounded-2xl border border-white/10 bg-ink-800 p-5 text-white shadow-card"
            aria-labelledby="profil"
          >
            <div className="flex items-center justify-between">
              <h2 id="profil" className="text-base font-black">
                {L('Mon profil', 'My profile', 'Mi perfil')}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/40 px-3 py-1 text-[11px] font-bold text-violet-100">
                <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                {L('Niveau', 'Level', 'Nivel')} {level}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              {prefs.userAvatar ? (
                <img
                  src={prefs.userAvatar}
                  alt=""
                  className="h-16 w-16 rounded-full border-2 border-white/20 object-cover"
                />
              ) : (
                <Avatar name={prefs.userName || 'CyberSens'} className="h-16 w-16 text-xl" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{prefs.userName}</p>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={xpInLevel}
                  aria-valuemin={0}
                  aria-valuemax={200}
                  aria-label="XP"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-brand"
                    style={{ width: `${(xpInLevel / 200) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[11px] text-slate-300">{xpInLevel} / 200 XP</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                [stats.lessonsDone, L('Leçons', 'Lessons', 'Lecciones'), BookOpen, 'text-cyan-300'],
                [badges, 'Badges', Award, 'text-amber-300'],
                [
                  certificates.length,
                  L('Certificats', 'Certificates', 'Certificados'),
                  Medal,
                  'text-sky-300',
                ],
              ].map(([n, label, Icon, color], i) => {
                const I = Icon as LucideIcon;
                return (
                  <div key={i} className="rounded-xl bg-white/5 px-2 py-3">
                    <I className={`mx-auto h-5 w-5 ${color as string}`} aria-hidden="true" />
                    <dd className="mt-1 text-lg font-black leading-none">{n as number}</dd>
                    <dt className="mt-1 text-[10px] text-slate-400">{label as string}</dt>
                  </div>
                );
              })}
            </dl>
            <button
              onClick={() => onStart(AppTab.LEADERBOARD)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-bold hover:bg-white/15 ${ring}`}
            >
              <Trophy className="h-4 w-4 text-gold" aria-hidden="true" />
              {L('Voir le classement', 'View leaderboard', 'Ver clasificación')}
            </button>
          </section>

          <section
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 p-5 text-white shadow-card"
            aria-labelledby="ia"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/30 ring-1 ring-brand-light/40">
                <Bot className="h-9 w-9 text-brand-light" aria-hidden="true" />
              </span>
              <div>
                <h2 id="ia" className="text-base font-black leading-tight">
                  {L('Assistant IA', 'AI assistant', 'Asistente IA')}
                  <span className="block text-lg text-brand-light">Gemini</span>
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  {L(
                    'Pose tes questions en cybersécurité',
                    'Ask your cybersecurity questions',
                    'Haz tus preguntas de ciberseguridad',
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => onStart(AppTab.AI_CHAT)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold hover:bg-brand-light ${ring}`}
            >
              {L('Discuter avec l’IA', 'Chat with the AI', 'Chatear con la IA')}{' '}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>

          <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 via-ink-800 to-ink-900 p-5 text-center text-white shadow-card">
            <Users className="mx-auto h-9 w-9 text-violet-300" aria-hidden="true" />
            <h2 className="mt-2 text-base font-black">
              {L('Rejoins la communauté', 'Join the community', 'Únete a la comunidad')}
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              {L(
                'Pose une question, partage une astuce ou une alerte.',
                'Ask a question, share a tip or an alert.',
                'Haz una pregunta, comparte un consejo o una alerta.',
              )}
            </p>
            <button
              onClick={() => onStart(AppTab.COMMUNITY)}
              className={`mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/15 ${ring}`}
            >
              <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
              {L('Ouvrir la communauté', 'Open the community', 'Abrir la comunidad')}
            </button>
          </section>

          <DonateCard onLearnMore={() => onStart(AppTab.DONATE)} />
        </aside>
      </div>

      {/* Actualités sur mobile */}
      <div className="space-y-5 lg:hidden">
        <NewsCard
          news={news}
          live={newsLive}
          ago={newsAgo}
          onOpen={() => onStart(AppTab.NEWS)}
          L={L}
        />
        <DonateCard onLearnMore={() => onStart(AppTab.DONATE)} />
      </div>
    </div>
  );
};

const NewsCard: React.FC<{
  news: LiveItem[];
  live: boolean;
  ago: (n: LiveItem) => string;
  onOpen: () => void;
  L: (fr: string, en: string, es: string) => string;
}> = ({ news, live, ago, onOpen, L }) => (
  <section className="rounded-2xl bg-white p-5 text-slate-900 shadow-card" aria-labelledby="actus">
    <div className="mb-4 flex items-center justify-between">
      <h2 id="actus" className="flex items-center gap-2 text-base font-black">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-800 text-white">
          <Newspaper className="h-4 w-4" aria-hidden="true" />
        </span>
        {L('Actualités cybersécurité', 'Cybersecurity news', 'Noticias de ciberseguridad')}
        {live && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700">
            Live
          </span>
        )}
      </h2>
      <button
        onClick={onOpen}
        className="rounded-lg text-xs font-bold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {L('Voir plus', 'See more', 'Ver más')}
      </button>
    </div>
    <ul className="space-y-3">
      {news.map((n) => (
        <li key={n.id}>
          <button
            onClick={onOpen}
            className="flex w-full items-start gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-700 to-ink-900 text-brand-light">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-black text-brand">{n.source}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{ago(n)}</span>
              </span>
              <span className="line-clamp-2 text-[12px] font-semibold leading-snug">{n.title}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

export default Home;
