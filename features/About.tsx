import React from 'react';
import {
  ShieldCheck,
  BookOpen,
  Flag,
  Gamepad2,
  Wrench,
  Bot,
  Newspaper,
  Trophy,
  Users,
  Award,
  Languages,
  Swords,
  GraduationCap,
  Lock,
  WifiOff,
  Fingerprint,
  KeyRound,
  Server,
  ArrowRight,
  Lightbulb,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../services/i18n';
import { getCourseModules } from '../services/learningContent';
import { CHALLENGE_FACTORIES } from './CTF/ctfGenerator';
import { Card, useL } from '../components/ui';
import { DonateCard } from '../components/DonateCard';
import { AppTab } from '../types';

interface AboutProps {
  onBack: () => void;
  onNavigate?: (tab: AppTab) => void;
}

const GAMES_COUNT = 9;
const TOOLS_COUNT = 6;

const About: React.FC<AboutProps> = ({ onBack, onNavigate }) => {
  const { language } = useI18n();
  const L = useL();
  const modules = getCourseModules(language);
  const lessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const ctf = Object.keys(CHALLENGE_FACTORIES).length;
  const go = (tab: AppTab) => (onNavigate ? onNavigate(tab) : onBack());

  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  const pillars: { icon: LucideIcon; title: string; text: string; tone: string }[] = [
    {
      icon: Lightbulb,
      title: L('Comprendre', 'Understand', 'Comprender'),
      text: L(
        'Des modules courts et progressifs, du niveau débutant à avancé, pour comprendre les menaces sans jargon inutile.',
        'Short, progressive modules from beginner to advanced, to understand threats without needless jargon.',
        'Módulos cortos y progresivos, de principiante a avanzado, para entender las amenazas sin jerga innecesaria.',
      ),
      tone: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    },
    {
      icon: Target,
      title: L('S’entraîner', 'Practise', 'Practicar'),
      text: L(
        'Quiz, défis CTF, mini-jeux et laboratoires pour transformer la théorie en réflexes concrets.',
        'Quizzes, CTF challenges, mini-games and labs to turn theory into concrete reflexes.',
        'Quizzes, retos CTF, minijuegos y laboratorios para convertir la teoría en reflejos concretos.',
      ),
      tone: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    },
    {
      icon: ShieldCheck,
      title: L('Se protéger', 'Protect yourself', 'Protegerse'),
      text: L(
        'Des outils d’analyse, un assistant IA et l’actualité cyber en direct pour agir au quotidien.',
        'Analysis tools, an AI assistant and live cyber news to act day to day.',
        'Herramientas de análisis, un asistente IA y noticias cyber en directo para actuar a diario.',
      ),
      tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      icon: Award,
      title: L('Certifier', 'Get certified', 'Certificarse'),
      text: L(
        'Un examen corrigé par le serveur et un certificat signé, vérifiable par n’importe qui.',
        'A server-graded exam and a signed certificate that anyone can verify.',
        'Un examen corregido por el servidor y un certificado firmado que cualquiera puede verificar.',
      ),
      tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    },
  ];

  const features: { icon: LucideIcon; title: string; detail: string }[] = [
    {
      icon: BookOpen,
      title: L('Formations', 'Courses', 'Formaciones'),
      detail: `${modules.length} ${L('modules', 'modules', 'módulos')} · ${lessons} ${L('leçons', 'lessons', 'lecciones')}`,
    },
    {
      icon: Flag,
      title: L('Arène CTF', 'CTF Arena', 'Arena CTF'),
      detail: `${ctf} ${L('défis à drapeaux aléatoires', 'challenges with random flags', 'retos con banderas aleatorias')}`,
    },
    {
      icon: Gamepad2,
      title: L('Mini-jeux', 'Mini-games', 'Minijuegos'),
      detail: `${GAMES_COUNT} ${L('jeux de défense et d’attaque', 'defence and attack games', 'juegos de defensa y ataque')}`,
    },
    {
      icon: Wrench,
      title: L('Outils de sécurité', 'Security tools', 'Herramientas de seguridad'),
      detail: `${TOOLS_COUNT} ${L('outils d’analyse', 'analysis tools', 'herramientas de análisis')}`,
    },
    {
      icon: Bot,
      title: L('Assistant IA', 'AI assistant', 'Asistente IA'),
      detail: L(
        'Spécialisé en cybersécurité (Gemini)',
        'Specialised in cybersecurity (Gemini)',
        'Especializado en ciberseguridad (Gemini)',
      ),
    },
    {
      icon: Newspaper,
      title: L('Actualités', 'News', 'Noticias'),
      detail: L(
        'Flux de sites spécialisés, en direct',
        'Live feeds from specialist sites',
        'Fuentes de sitios especializados, en directo',
      ),
    },
    {
      icon: Trophy,
      title: L('Classements', 'Leaderboard', 'Clasificaciones'),
      detail: L(
        'Points d’expérience et niveaux',
        'Experience points and levels',
        'Puntos de experiencia y niveles',
      ),
    },
    {
      icon: Users,
      title: L('Communauté', 'Community', 'Comunidad'),
      detail: L(
        'Questions, astuces et alertes',
        'Questions, tips and alerts',
        'Preguntas, consejos y alertas',
      ),
    },
    {
      icon: Languages,
      title: L('3 langues', '3 languages', '3 idiomas'),
      detail: 'Français · English · Español',
    },
  ];

  const trust: { icon: LucideIcon; text: string }[] = [
    {
      icon: Lock,
      text: L(
        'Mots de passe protégés par un hachage robuste (scrypt), jamais stockés en clair.',
        'Passwords protected with strong hashing (scrypt), never stored in clear text.',
        'Contraseñas protegidas con un hash robusto (scrypt), nunca almacenadas en claro.',
      ),
    },
    {
      icon: Fingerprint,
      text: L(
        'Examens corrigés côté serveur et certificats signés : impossible de se donner une bonne note.',
        'Exams graded on the server and signed certificates: you cannot give yourself a good grade.',
        'Exámenes corregidos en el servidor y certificados firmados: no se puede uno dar una buena nota.',
      ),
    },
    {
      icon: KeyRound,
      text: L(
        'La clé de l’assistant IA reste sur le serveur et n’est jamais envoyée à votre navigateur.',
        'The AI assistant key stays on the server and is never sent to your browser.',
        'La clave del asistente IA permanece en el servidor y nunca se envía a su navegador.',
      ),
    },
    {
      icon: Users,
      text: L(
        'Dans les classements et la communauté, seuls votre prénom et l’initiale de votre nom sont visibles.',
        'On leaderboards and in the community, only your first name and last initial are visible.',
        'En las clasificaciones y la comunidad solo se ven su nombre y la inicial de su apellido.',
      ),
    },
    {
      icon: WifiOff,
      text: L(
        'Application installable, utilisable hors ligne pour les cours, quiz, jeux et le CTF.',
        'Installable app, usable offline for courses, quizzes, games and the CTF.',
        'Aplicación instalable, utilizable sin conexión para cursos, quizzes, juegos y el CTF.',
      ),
    },
  ];

  const stack = ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'SQLite', 'PWA', 'Gemini'];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Bandeau */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-6 text-white shadow-card sm:p-10">
        <ShieldCheck
          className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 text-brand/20 sm:h-72 sm:w-72"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-light">
            {L(
              'Sensibiliser • Protéger • Agir',
              'Raise awareness • Protect • Act',
              'Sensibilizar • Proteger • Actuar',
            )}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            {L('À propos de', 'About', 'Acerca de')}{' '}
            <span className="text-brand-light">CyberSens</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            {L(
              'CyberSens est une plateforme gratuite de formation et de sensibilisation à la cybersécurité, pensée pour les particuliers, les étudiants, les professionnels et les entreprises.',
              'CyberSens is a free cybersecurity training and awareness platform, designed for individuals, students, professionals and companies.',
              'CyberSens es una plataforma gratuita de formación y concienciación en ciberseguridad, pensada para particulares, estudiantes, profesionales y empresas.',
            )}
          </p>
        </div>
      </section>

      {/* Le projet */}
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">
          {L('Le projet', 'The project', 'El proyecto')}
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          <p>
            {L(
              'La plupart des cyberattaques ne réussissent pas grâce à une prouesse technique, mais parce qu’un humain a cliqué, répondu ou fait confiance au mauvais moment : hameçonnage, mots de passe faibles, arnaques par SMS ou par appel, fausses alertes.',
              'Most cyberattacks do not succeed through technical prowess, but because a human clicked, replied or trusted at the wrong moment: phishing, weak passwords, SMS and phone scams, fake alerts.',
              'La mayoría de los ciberataques no triunfan por una hazaña técnica, sino porque una persona hizo clic, respondió o confió en el momento equivocado: phishing, contraseñas débiles, estafas por SMS o llamada, falsas alertas.',
            )}
          </p>
          <p>
            {L(
              'CyberSens part de ce constat : la meilleure défense est une vigilance apprise et pratiquée. La plateforme réunit donc cours, exercices, jeux, outils et actualités au même endroit, avec des exemples proches de la réalité — y compris les arnaques Mobile Money très présentes en Afrique de l’Ouest.',
              'CyberSens starts from this observation: the best defence is vigilance that is learned and practised. The platform therefore brings courses, exercises, games, tools and news together in one place, with realistic examples — including the Mobile Money scams common in West Africa.',
              'CyberSens parte de esta constatación: la mejor defensa es una vigilancia aprendida y practicada. La plataforma reúne así cursos, ejercicios, juegos, herramientas y noticias en un solo lugar, con ejemplos realistas, incluidas las estafas de Mobile Money muy presentes en África Occidental.',
            )}
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, text, tone }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-black">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {text}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Contenu */}
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">
          {L('Ce que vous y trouverez', 'What you will find', 'Lo que encontrará')}
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, detail }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-ink-900/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Le développeur */}
      <section
        className="overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 via-white to-violet-500/10 shadow-card dark:from-brand/20 dark:via-ink-800 dark:to-violet-600/20 dark:border-brand/30"
        aria-labelledby="dev"
      >
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-violet-600 text-3xl font-black text-white shadow-glow"
              aria-hidden="true"
            >
              VD
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand dark:text-brand-light">
              {L('Le développeur', 'The developer', 'El desarrollador')}
            </p>
            <h2 id="dev" className="mt-1 text-2xl font-black sm:text-3xl">
              VDPHACKER
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                <Swords className="h-3.5 w-3.5" aria-hidden="true" />
                {L('Pentesteur Junior', 'Junior Pentester', 'Pentester Junior')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-black text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                {L(
                  'Formateur en cybersécurité & IA',
                  'Cybersecurity & AI trainer',
                  'Formador en ciberseguridad e IA',
                )}
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              <p>
                {L(
                  'VDPHACKER est le développeur de CyberSens. Pentesteur junior, il éprouve la sécurité des systèmes en se plaçant du côté de l’attaquant pour mieux comprendre comment les défendre.',
                  'VDPHACKER is the developer of CyberSens. A junior pentester, he tests the security of systems from the attacker’s side to better understand how to defend them.',
                  'VDPHACKER es el desarrollador de CyberSens. Pentester junior, pone a prueba la seguridad de los sistemas desde el lado del atacante para entender mejor cómo defenderlos.',
                )}
              </p>
              <p>
                {L(
                  'Formateur en cybersécurité et en intelligence artificielle, il transforme cette expérience du terrain en parcours pédagogiques clairs et concrets, pour que chacun puisse se protéger sans être expert. Son nom figure comme émetteur sur les certificats CyberSens.',
                  'A trainer in cybersecurity and artificial intelligence, he turns this field experience into clear, practical learning paths so that anyone can protect themselves without being an expert. His name appears as issuer on CyberSens certificates.',
                  'Formador en ciberseguridad e inteligencia artificial, convierte esta experiencia de campo en itinerarios formativos claros y concretos, para que cualquiera pueda protegerse sin ser experto. Su nombre figura como emisor en los certificados de CyberSens.',
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Confiance */}
      <Card className="p-6 sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">
          {L(
            'Pensée pour votre sécurité',
            'Built with your security in mind',
            'Pensada para su seguridad',
          )}
        </h2>
        <ul className="mt-4 space-y-3">
          {trust.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5 dark:border-white/10">
          <Server className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="mr-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {L('Technologies', 'Technologies', 'Tecnologías')} :
          </span>
          {stack.map((s) => (
            <span
              key={s}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200"
            >
              {s}
            </span>
          ))}
        </div>
      </Card>

      {/* Soutenir + rejoindre */}
      <div className="grid gap-6 md:grid-cols-2">
        <DonateCard onLearnMore={() => go(AppTab.DONATE)} />
        <Card className="flex flex-col justify-between p-6">
          <div>
            <Users className="h-9 w-9 text-brand dark:text-brand-light" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-black">
              {L('Passez à l’action', 'Take action', 'Pase a la acción')}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {L(
                'Commencez une formation, testez-vous avec un quiz ou posez vos questions à la communauté.',
                'Start a course, test yourself with a quiz or ask the community your questions.',
                'Empiece una formación, pruébese con un quiz o haga sus preguntas a la comunidad.',
              )}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => go(AppTab.LEARN)}
              className={`inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-brand-dark ${ring}`}
            >
              {L('Voir les formations', 'See the courses', 'Ver las formaciones')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => go(AppTab.COMMUNITY)}
              className={`rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5 ${ring}`}
            >
              {L('Rejoindre la communauté', 'Join the community', 'Unirse a la comunidad')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default About;
