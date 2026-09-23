import React, { useState } from 'react';
import {
  Shield,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Newspaper,
  Search,
  ArrowRight,
  Sparkles,
  Bot,
  Flag,
  Clock,
  ChevronRight,
  Scan,
  Award,
  Wrench,
} from 'lucide-react';
import { AppTab, NewsArticle } from '../types';
import { getPreferences, getCertificates } from '../services/persistenceService';
import { useI18n } from '../services/i18n';
import { NEWS_ARTICLES, COURSE_MODULES } from '../services/learningContent';
import { ArticleDetailModal } from '../components/ArticleDetailModal';
import { PhishingScannerModal } from '../components/PhishingScannerModal';
import { CertificateModal } from '../components/CertificateModal';

interface HomeProps {
  onStart: (tab: AppTab) => void;
  onSelectArticle?: (article: NewsArticle) => void;
}

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  const { t } = useI18n();
  const prefs = getPreferences();
  const certificates = getCertificates();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  // Recommended article
  const recommendedArticle = NEWS_ARTICLES.find((a) => a.id === 'article-6') || NEWS_ARTICLES[0];

  // Tool items for instant search lookup
  const toolKeywords = [
    {
      title: 'Testeur de Deepfakes IA (Audio, Vidéo, Prompts)',
      keys: ['deepfake', 'ia', 'voix', 'audio', 'video'],
      sub: 'Outils Sécu • Détection Heuristique',
    },
    {
      title: 'Audit de Logs & Sécurité IA',
      keys: ['audit', 'log', 'analyse', 'serveur'],
      sub: 'Outils Sécu • Audit automatisé Gemini',
    },
    {
      title: 'Testeur de Liens Douteux & URL',
      keys: ['lien', 'url', 'domaine', 'lien douteux'],
      sub: 'Outils Sécu • Détection URL suspectes',
    },
    {
      title: 'Analyseur Phishing & SMS',
      keys: ['phishing', 'email', 'sms', 'arnaque'],
      sub: 'Outils Sécu • Ruses psychologiques',
    },
    {
      title: 'Testeur de Mots de Passe & Entropie',
      keys: ['mot de passe', 'password', 'mdp', 'entropie'],
      sub: 'Outils Sécu • Force & Robustesse',
    },
    {
      title: 'Boîte à Outils Sécurité Complète',
      keys: ['outil', 'outils', 'secu', 'tools', 'scanner'],
      sub: 'Outils Sécu • 6 outils pratiques',
    },
  ];

  // Real-time search matches
  const searchResults: {
    type: string;
    title: string;
    sub: string;
    tab?: AppTab;
    article?: NewsArticle;
  }[] = searchQuery.trim()
    ? [
        ...toolKeywords
          .filter(
            (tk) =>
              tk.keys.some(
                (k) =>
                  k.includes(searchQuery.toLowerCase()) || searchQuery.toLowerCase().includes(k),
              ) || tk.title.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((tk) => ({
            type: 'outil',
            title: tk.title,
            sub: tk.sub,
            tab: AppTab.TOOLS,
          })),
        ...COURSE_MODULES.filter((m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()),
        ).map((m) => ({
          type: 'formation',
          title: m.title,
          sub: `${m.lessonsCount} leçons • ${m.level}`,
          tab: AppTab.LEARN,
        })),
        ...NEWS_ARTICLES.filter((a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()),
        ).map((a) => ({
          type: 'actualite',
          title: a.title,
          sub: `${a.category} • ${a.readTime}`,
          article: a,
        })),
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-7 space-y-6 animate-in fade-in duration-300">
      {/* Top Greeting Bar matching Screen 2 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            {t('home.greeting', 'Bonjour')} {prefs.userName.split(' ')[0]}{' '}
            <span className="text-amber-500">☀️</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('home.tagline', 'La cybersécurité commence par toi !')}
          </p>
        </div>

        {/* User Status Badge */}
        <div className="flex items-center gap-2">
          {certificates.length > 0 && (
            <button
              onClick={() => setShowCertificate(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-sm hover:scale-105 transition-transform"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {certificates.length} {t('home.certificates', 'Certificats')}
              </span>
            </button>
          )}

          <div className="px-3 py-1.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {t('home.level', 'Niveau')} {prefs.level || 2}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input matching Screen 2 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'home.search_placeholder',
            'Rechercher un sujet, un conseil, une arnaque...',
          )}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            {t('home.clear', 'Effacer')}
          </button>
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-30 space-y-1 max-h-64 overflow-y-auto">
            {searchResults.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  if (res.article) {
                    setSelectedArticle(res.article);
                  } else if (res.tab) {
                    onStart(res.tab);
                  }
                  setSearchQuery('');
                }}
                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {res.title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{res.sub}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 uppercase">
                  {res.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hero Banner Card matching Screen 2 photo */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 border border-sky-500/30 shadow-xl p-6 sm:p-7 text-white">
        <div className="relative z-10 max-w-md space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('home.hero_badge', 'CyberSens Alerte & Conseil')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {t('home.hero_title', 'Reste vigilant sur internet !')}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            {t(
              'home.hero_desc',
              'Identifie les menaces, adopte les bons réflexes et obtiens ton certificat officiel en cybersécurité.',
            )}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onStart(AppTab.PRACTICES)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black shadow-lg shadow-sky-500/30 transition-all active:scale-95"
            >
              <span>{t('home.btn_learn_more', 'En savoir plus')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onStart(AppTab.LEARN)}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              {t('home.btn_start_course', 'Commencer un cours')}
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="px-3 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/40 transition-colors flex items-center gap-1"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{t('home.btn_scan_scam', 'Scanner une arnaque')}</span>
            </button>
          </div>
        </div>

        {/* Decorative Glowing Hacker / Shield Background */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 sm:w-56 sm:h-56 opacity-25 pointer-events-none">
          <img
            src="/favicon.svg"
            alt="Security Shield"
            className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(56,189,248,0.5)]"
          />
        </div>
      </div>

      {/* 4 Main Grid Cards matching Screen 2 in Light Mode */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Formations */}
        <button
          onClick={() => onStart(AppTab.LEARN)}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            {t('home.card_learn', 'Formations')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('home.card_learn_sub', 'Apprendre avec certificat')}
          </span>
        </button>

        {/* Card 2: Quiz */}
        <button
          onClick={() => onStart(AppTab.QUIZ)}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-md transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-5 h-5" />
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
            {t('home.card_quiz', 'Quiz')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('home.card_quiz_sub', 'Tester ses connaissances')}
          </span>
        </button>

        {/* Card 3: Bonnes pratiques */}
        <button
          onClick={() => onStart(AppTab.PRACTICES)}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
            {t('home.card_practices', 'Bonnes pratiques')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('home.card_practices_sub', 'Se protéger au quotidien')}
          </span>
        </button>

        {/* Card 4: Actualités */}
        <button
          onClick={() => onStart(AppTab.NEWS)}
          className="flex flex-col items-start p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-md transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
            <Newspaper className="w-5 h-5" />
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
            {t('home.card_news', 'Actualités')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('home.card_news_sub', 'Alertes & veille en direct')}
          </span>
        </button>
      </div>

      {/* Recommandé pour toi Section matching Screen 2 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            {t('home.recommended_title', 'Recommandé pour toi')}
          </h3>
          <button
            onClick={() => onStart(AppTab.NEWS)}
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
          >
            <span>{t('home.see_all', 'Voir tout')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recommended Article Card matching photo */}
        <div
          onClick={() => setSelectedArticle(recommendedArticle)}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer group shadow-sm"
        >
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-950">
            <img
              src={recommendedArticle.image}
              alt={recommendedArticle.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors line-clamp-1">
              {recommendedArticle.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {recommendedArticle.summary}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {recommendedArticle.readTime}
              </span>
              <span>•</span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold">
                {t('home.priority_tips', 'Conseils prioritaires')}
              </span>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </div>

      {/* Advanced Innovations & Labs */}
      <div className="pt-2 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {t('home.innovations_title', 'Innovations & Laboratoires Pratiques')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Scanner Anti-Phishing Innovation */}
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-rose-500 hover:shadow-md transition-all text-left group shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-rose-600">
                {t('home.scanner_title', 'Scanner Anti-Phishing')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('home.scanner_sub', "Détection d'arnaques SMS/Mail")}
              </span>
            </div>
          </button>

          {/* Outils Sécurité & Testeurs */}
          <button
            onClick={() => onStart(AppTab.TOOLS)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-sky-500 hover:shadow-md transition-all text-left group shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-sky-600">
                {t('home.tools_title', 'Outils Sécu & Testeurs')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('home.tools_sub', 'Deepfakes, Liens, Mots de passe')}
              </span>
            </div>
          </button>

          {/* CyberGuard IA */}
          <button
            onClick={() => onStart(AppTab.AI_CHAT)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-cyan-500 hover:shadow-md transition-all text-left group shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-cyan-600">
                {t('home.aichat_title', 'CyberGuard IA')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('home.aichat_sub', 'Assistant & Détection')}
              </span>
            </div>
          </button>

          {/* Arène CTF */}
          <button
            onClick={() => onStart(AppTab.CTF)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 hover:shadow-md transition-all text-left group shadow-sm"
          >
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-amber-600">
                {t('home.ctf_title', 'Arène CTF')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('home.ctf_sub', 'Défis éthiques pratiques')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}

      {/* Phishing Scanner Innovation Modal */}
      {showScanner && <PhishingScannerModal onClose={() => setShowScanner(false)} />}

      {/* Certificate Modal */}
      {showCertificate && certificates.length > 0 && (
        <CertificateModal certificate={certificates[0]} onClose={() => setShowCertificate(false)} />
      )}
    </div>
  );
};
