import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Flag,
  Gamepad2,
  Award,
  Bot,
  Trophy,
  Users,
  Newspaper,
  Wrench,
  Check,
  Globe,
  WifiOff,
  Lock,
  LifeBuoy,
  House,
} from 'lucide-react';
import { LanguageSelector, useI18n } from '../services/i18n';
import { useL } from '../components/ui';
import { getAuthConfig } from '../services/authService';
import { TermsDialog } from './Legal/TermsDialog';
import Guide from './Guide';

interface LandingProps {
  /** Ouvre l'écran de connexion ou d'inscription. */
  onEnter: (mode: 'login' | 'register') => void;
}

const FEATURES = [
  {
    icon: GraduationCap,
    title: ['12 modules de formation', '12 training modules', '12 módulos de formación'],
    text: [
      '60 leçons avec quiz et examens, de l’hygiène numérique de base aux sujets avancés (DevSecOps, IA, criminalistique).',
      '60 lessons with quizzes and exams, from basic digital hygiene to advanced topics (DevSecOps, AI, forensics).',
      '60 lecciones con cuestionarios y exámenes, desde la higiene digital básica hasta temas avanzados (DevSecOps, IA, forense).',
    ],
  },
  {
    icon: Flag,
    title: ['Arène CTF', 'CTF arena', 'Arena CTF'],
    text: [
      '24 défis techniques réels (injection, cryptographie, ingénierie sociale, prompt injection…) avec indices pédagogiques.',
      '24 real technical challenges (injection, cryptography, social engineering, prompt injection…) with guided hints.',
      '24 retos técnicos reales (inyección, criptografía, ingeniería social, prompt injection…) con pistas pedagógicas.',
    ],
  },
  {
    icon: Bot,
    title: ['Assistant IA', 'AI assistant', 'Asistente IA'],
    text: [
      'CyberGuard IA répond à vos questions, analyse un message suspect et évalue son niveau de danger.',
      'CyberGuard AI answers your questions, analyzes a suspicious message and rates its danger level.',
      'CyberGuard IA responde tus preguntas, analiza un mensaje sospechoso y evalúa su nivel de peligro.',
    ],
  },
  {
    icon: Gamepad2,
    title: ['9 mini-jeux', '9 mini-games', '9 minijuegos'],
    text: [
      'Phishing, pare-feu, chiffrement, menaces liées à l’IA : apprenez en jouant, seul ou en classe.',
      'Phishing, firewall, encryption, AI-related threats: learn by playing, alone or in class.',
      'Phishing, cortafuegos, cifrado, amenazas de IA: aprende jugando, solo o en clase.',
    ],
  },
  {
    icon: Award,
    title: ['Certificats vérifiables', 'Verifiable certificates', 'Certificados verificables'],
    text: [
      'Chaque examen réussi délivre un certificat signé par le serveur, vérifiable publiquement par son numéro.',
      'Every passed exam issues a server-signed certificate, publicly verifiable by its number.',
      'Cada examen aprobado emite un certificado firmado por el servidor, verificable públicamente por su número.',
    ],
  },
  {
    icon: Trophy,
    title: ['Classements', 'Leaderboards', 'Clasificaciones'],
    text: [
      'Progressez, gagnez des points et comparez-vous aux autres membres — ou restez discret, en option.',
      'Progress, earn points and compare yourself to other members — or stay hidden, optionally.',
      'Progresa, gana puntos y compárate con otros miembros — u oculta tu progreso si lo prefieres.',
    ],
  },
  {
    icon: Users,
    title: ['Communauté', 'Community', 'Comunidad'],
    text: [
      'Posez vos questions, partagez une astuce, signalez une arnaque repérée dans votre entourage.',
      'Ask questions, share a tip, report a scam you spotted around you.',
      'Haz preguntas, comparte un consejo, reporta una estafa que hayas detectado.',
    ],
  },
  {
    icon: Wrench,
    title: ['Outils d’analyse', 'Analysis tools', 'Herramientas de análisis'],
    text: [
      'Vérificateur de mots de passe, détecteur d’hameçonnage, analyseur d’en-têtes e-mail et plus.',
      'Password checker, phishing detector, email header analyzer and more.',
      'Verificador de contraseñas, detector de phishing, analizador de cabeceras de correo y más.',
    ],
  },
  {
    icon: Newspaper,
    title: ['Actualités en direct', 'Live news', 'Actualidad en vivo'],
    text: [
      'Flux d’actualités cybersécurité agrégé (CERT-FR, Krebs on Security, The Hacker News…) et indice de vigilance.',
      'Aggregated cybersecurity news feed (CERT-FR, Krebs on Security, The Hacker News…) and a vigilance index.',
      'Feed de noticias de ciberseguridad agregado (CERT-FR, Krebs on Security, The Hacker News…) e índice de vigilancia.',
    ],
  },
];

const TRUST_POINTS = [
  {
    icon: Check,
    text: ['Gratuit, sans publicité', 'Free, no ads', 'Gratis, sin publicidad'],
  },
  {
    icon: Globe,
    text: ['Français, anglais, espagnol', 'French, English, Spanish', 'Francés, inglés, español'],
  },
  {
    icon: WifiOff,
    text: [
      'Installable, cours disponibles hors ligne',
      'Installable, courses available offline',
      'Instalable, cursos disponibles sin conexión',
    ],
  },
  {
    icon: Lock,
    text: [
      'Mots de passe hachés, jamais stockés en clair',
      'Hashed passwords, never stored in clear text',
      'Contraseñas hasheadas, nunca almacenadas en texto plano',
    ],
  },
];

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const L = useL();
  const { language } = useI18n();
  const idx = language === 'en' ? 1 : language === 'es' ? 2 : 0;
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [view, setView] = useState<'home' | 'guide'>('home');

  useEffect(() => {
    getAuthConfig()
      .then((c) => setContactEmail(c.contactEmail ?? null))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white">
      {showTerms && <TermsDialog contactEmail={contactEmail} onClose={() => setShowTerms(false)} />}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="w-8 h-8" />
          <span className="text-lg font-black tracking-tight">CyberSens</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <button
            onClick={() => onEnter('login')}
            className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5 transition-colors"
          >
            {L('Se connecter', 'Sign in', 'Iniciar sesión')}
          </button>
          <button
            onClick={() => onEnter('register')}
            className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-sm font-bold shadow-md shadow-sky-600/20 transition-colors"
          >
            {L('Créer un compte', 'Sign up', 'Crear cuenta')}
          </button>
        </div>
      </header>

      {/* Onglets */}
      <nav
        aria-label={L('Sections', 'Sections', 'Secciones')}
        className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-8"
      >
        {(
          [
            ['home', House, L('Accueil', 'Home', 'Inicio')],
            ['guide', LifeBuoy, L('Guide', 'Guide', 'Guía')],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setView(id);
              window.scrollTo({ top: 0 });
            }}
            aria-current={view === id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              view === id
                ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {view === 'guide' ? (
        <div className="px-4 pb-12 pt-6 sm:px-8">
          <Guide onBack={() => setView('home')} onEnter={onEnter} />
        </div>
      ) : (
        <>
          {/* Hero */}
          <section className="px-4 sm:px-8 pt-8 pb-14 sm:pt-14 sm:pb-20 max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              {L(
                'Sensibiliser • Protéger • Agir',
                'Raise awareness • Protect • Act',
                'Sensibilizar • Proteger • Actuar',
              )}
            </span>
            <h1 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {L(
                'Apprenez la cybersécurité en la pratiquant',
                'Learn cybersecurity by practicing it',
                'Aprende ciberseguridad practicándola',
              )}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {L(
                'CyberSens est une plateforme gratuite de formation à la cybersécurité : cours, quiz, arène CTF, mini-jeux, certificats vérifiables et assistant IA. Pour les particuliers, les étudiants et les équipes.',
                'CyberSens is a free cybersecurity training platform: courses, quizzes, a CTF arena, mini-games, verifiable certificates and an AI assistant. For individuals, students and teams.',
                'CyberSens es una plataforma gratuita de formación en ciberseguridad: cursos, cuestionarios, arena CTF, minijuegos, certificados verificables y un asistente de IA. Para particulares, estudiantes y equipos.',
              )}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onEnter('register')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-sm font-black shadow-lg shadow-sky-600/25 transition-all active:scale-[0.99]"
              >
                {L('Créer un compte gratuit', 'Create a free account', 'Crear una cuenta gratis')}
              </button>
              <button
                onClick={() => onEnter('login')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-white/60 dark:hover:bg-white/5 transition-all"
              >
                {L('J’ai déjà un compte', 'I already have an account', 'Ya tengo una cuenta')}
              </button>
            </div>

            {/* Trust points */}
            <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
              {TRUST_POINTS.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  <p.icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  {p.text[idx]}
                </li>
              ))}
            </ul>
          </section>

          {/* Features */}
          <section className="px-4 sm:px-8 pb-16 sm:pb-24 max-w-6xl mx-auto">
            <h2 className="text-center text-2xl sm:text-3xl font-black tracking-tight">
              {L(
                'Tout ce qu’il faut pour progresser',
                'Everything you need to improve',
                'Todo lo necesario para progresar',
              )}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center text-sky-700 dark:text-sky-400 mb-3">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-sm">{f.title[idx]}</h3>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {f.text[idx]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA band */}
          <section className="px-4 sm:px-8 pb-16 sm:pb-24 max-w-4xl mx-auto text-center">
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 dark:bg-slate-900 border border-slate-800 shadow-2xl">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {L(
                  'Prêt à commencer ? C’est gratuit.',
                  'Ready to start? It’s free.',
                  '¿Listo para empezar? Es gratis.',
                )}
              </h2>
              <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                {L(
                  'Créez votre compte en une minute et suivez votre premier module dès aujourd’hui.',
                  'Create your account in a minute and start your first module today.',
                  'Crea tu cuenta en un minuto y empieza hoy tu primer módulo.',
                )}
              </p>
              <button
                onClick={() => onEnter('register')}
                className="mt-6 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black shadow-lg shadow-sky-600/30 transition-all active:scale-[0.99]"
              >
                {L('Créer mon compte', 'Create my account', 'Crear mi cuenta')}
              </button>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-6 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>
          CyberSens —{' '}
          {L(
            'Formateur en Cybersécurité & IA',
            'Cybersecurity & AI trainer',
            'Formador en Ciberseguridad e IA',
          )}
          : VDPHACKER
        </p>
        <button onClick={() => setShowTerms(true)} className="mt-1.5 font-bold underline">
          {L(
            'Conditions d’utilisation et confidentialité',
            'Terms of use and privacy',
            'Condiciones de uso y privacidad',
          )}
        </button>
      </footer>
    </div>
  );
};

export default Landing;
