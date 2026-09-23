import React, { useState, useEffect } from 'react';
import { NEWS_ARTICLES } from '../services/learningContent';
import { NewsArticle, LiveThreatAlert } from '../types';
import { ArticleDetailModal } from '../components/ArticleDetailModal';
import { PhishingScannerModal } from '../components/PhishingScannerModal';
import { useI18n } from '../services/i18n';
import {
  Newspaper,
  Clock,
  Tag,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Filter,
  RefreshCw,
  Radio,
  AlertTriangle,
  Scan,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface NewsProps {
  onBack?: () => void;
}

export const News: React.FC<NewsProps> = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<
    'Toutes' | 'Menaces' | 'Conseils' | 'Événements'
  >('Toutes');
  const [articles, setArticles] = useState<NewsArticle[]>(NEWS_ARTICLES);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("À l'instant");
  const [showScanner, setShowScanner] = useState(false);

  // Live Threat Ticker data
  const [breakingAlert, setBreakingAlert] = useState<LiveThreatAlert>({
    id: 'alert-live-1',
    title: "Campagne active de faux SMS bancaires et Mobile Money détectée en Afrique de l'Ouest",
    level: 'CRITIQUE',
    timestamp: 'Il y a 4 min',
    vector: 'SMS / Smishing',
    actionRequired: 'Ne composez aucun code USSD et ne partagez aucun PIN.',
  });

  const categories = [
    { key: 'Toutes' as const, label: t('news.all', 'Toutes') },
    { key: 'Menaces' as const, label: t('news.threats', 'Menaces') },
    { key: 'Conseils' as const, label: t('news.tips', 'Conseils') },
    { key: 'Événements' as const, label: t('news.events', 'Événements') },
  ];

  // Real-time live dynamic update simulator
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Add a fresh real-time incident bulletin
      const freshArticle: NewsArticle = {
        id: `news-live-${Date.now()}`,
        title: 'Alerte Urgence : Fausses invitations de réinitialisation WhatsApp en circulation',
        category: 'Menaces',
        timeAgo: "À l'instant (Direct)",
        readTime: '2 min',
        author: 'CyberSens CERT',
        tag: 'Social Engineering',
        image:
          'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        summary:
          'Des cybercriminels envoient des SMS demandant un code à 6 chiffres pour prétendument sécuriser votre compte WhatsApp.',
        content: [
          'Le CERT CyberSens signale une vague massive de détournements de comptes WhatsApp.',
          'La méthode : vous recevez un code par SMS sans l’avoir demandé, suivi d’un message d’un proche dont le compte a déjà été piraté disant "J’ai envoyé mon code chez toi par erreur, renvoie-le moi vite !".',
          'Règle d’or absolue : Ne transmettez jamais ce code à 6 chiffres. Activez impérativement la vérification en 2 étapes dans les paramètres de WhatsApp.',
        ],
        keyPoints: [
          'Ne jamais renvoyer un code de vérification SMS à un contact',
          'Activer la vérification en 2 étapes avec code PIN personnel',
          'En cas de doute, appelez le contact vocalement pour confirmer',
        ],
      };

      setArticles((prev) => [freshArticle, ...prev.filter((a) => a.id !== freshArticle.id)]);
      setLastRefreshed(
        'Mis à jour à ' +
          new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      );
      setIsRefreshing(false);
    }, 600);
  };

  // Auto-refresh timer every 45 seconds to keep news always updated
  useEffect(() => {
    const timer = setInterval(() => {
      const minutesAgo = Math.floor(Math.random() * 5) + 1;
      setLastRefreshed(`Il y a ${minutesAgo} min`);
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  const filteredArticles = articles.filter((art) => {
    if (activeCategory === 'Toutes') return true;
    return art.category === activeCategory;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-7 space-y-6">
      {/* Header matching Screen 7 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('news.title', 'Actualités & Veille Cyber')}
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase">
              <Radio className="w-3 h-3 animate-pulse text-rose-600" />
              <span>{t('news.live_badge', 'LIVE')}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'news.subtitle',
              "Flux d'informations actualisé en direct sur les menaces, alertes et bons réflexes.",
            )}
          </p>
        </div>

        {/* Live Refresh CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 transition-colors shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`}
            />
            <span>
              {isRefreshing
                ? t('news.refreshing', 'Actualisation...')
                : t('news.refresh_btn', 'Actualiser en direct')}
            </span>
          </button>
        </div>
      </div>

      {/* Breaking Threat Ticker Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500 text-white shadow-sm shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {t('news.urgent_alert', 'Alerte Urgence Cyber')} • {breakingAlert.timestamp}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {breakingAlert.title}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowScanner(true)}
          className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>{t('news.scan_sms', 'Scanner un SMS')}</span>
        </button>
      </div>

      {/* Innovation Radar & Quick Tools Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-black text-sm border border-amber-200 dark:border-amber-800">
            74
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {t('news.vigilance_title', 'Indice de Vigilance Régional')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                {t('news.vigilance_level', 'ÉLEVÉ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'news.vigilance_desc',
                "Menaces prédominantes aujourd'hui : Hameçonnage bancaire, faux livreurs & vol de sessions.",
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <Scan className="w-3.5 h-3.5 text-sky-600" />
            <span>{t('news.scanner_btn', "Détecteur d'Arnaque IA")}</span>
          </button>
        </div>
      </div>

      {/* Category Pills matching Screen 7 */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap pl-2">
          {lastRefreshed}
        </span>
      </div>

      {/* News Feed List matching Screen 7 */}
      <div className="space-y-3.5">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer group shadow-sm"
          >
            {/* Thumbnail */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-950">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-bold text-sky-400 backdrop-blur-sm">
                {article.category}
              </span>
            </div>

            {/* Meta & Title */}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors line-clamp-2">
                {article.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 hidden sm:block">
                {article.summary}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {article.timeAgo}
                </span>
                <span>•</span>
                <span className="text-sky-600 dark:text-sky-400/90 font-semibold">
                  {article.readTime}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-slate-400">{article.tag}</span>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0" />
          </div>
        ))}
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}

      {/* Phishing Scanner Innovation Modal */}
      {showScanner && <PhishingScannerModal onClose={() => setShowScanner(false)} />}
    </div>
  );
};
