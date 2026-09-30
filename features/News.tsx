import React, { useState, useEffect, useCallback } from 'react';
import { getLocalizedNewsArticles } from '../services/learningContent';
import { NewsArticle } from '../types';
import { useL } from '../components/ui';
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

interface LiveFeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  lang: 'fr' | 'en';
  category: 'threats' | 'tips' | 'events';
  publishedAt: string;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80';

export const News: React.FC<NewsProps> = () => {
  const { t, language } = useI18n();
  type NewsCategoryKey = 'all' | 'threats' | 'tips' | 'events';

  const categoryMap = {
    all: 'all',
    threats: language === 'en' ? 'Threats' : language === 'es' ? 'Amenazas' : 'Menaces',
    tips: language === 'en' ? 'Tips' : language === 'es' ? 'Consejos' : 'Conseils',
    events: language === 'en' ? 'Events' : language === 'es' ? 'Eventos' : 'Événements',
  } as const;

  const [activeCategory, setActiveCategory] = useState<NewsCategoryKey>('all');
  const [articles, setArticles] = useState<NewsArticle[]>(() => getLocalizedNewsArticles(language));
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(t('news.just_now', 'À l’instant'));
  const [showScanner, setShowScanner] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isLive) setArticles(getLocalizedNewsArticles(language));
  }, [language, isLive]);

  const L = useL();
  // Indice de vigilance : calculé à partir du flux réel (articles « menaces » publiés ces dernières 24 h)
  const vigilance = (() => {
    if (!isLive) return null;
    const recent = articles.filter(
      (a) => a.publishedAt && now - new Date(a.publishedAt).getTime() <= 24 * 3600 * 1000,
    );
    const threats = recent.filter((a) => a.category === categoryMap.threats).length;
    const score = Math.min(100, 20 + threats * 8);
    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    return {
      score,
      level,
      threats,
      total: recent.length,
      sources: new Set(recent.map((a) => a.source)).size,
    };
  })();

  const latestThreat = isLive
    ? articles.find((a) => a.category === categoryMap.threats)
    : undefined;

  const categories = [
    { key: 'all' as const, label: t('news.all', 'Toutes') },
    { key: 'threats' as const, label: t('news.threats', 'Menaces') },
    { key: 'tips' as const, label: t('news.tips', 'Conseils') },
    { key: 'events' as const, label: t('news.events', 'Événements') },
  ];

  const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';

  const relativeTime = (iso: string) => {
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return t('news.just_now', 'À l’instant');
    const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
      minutes < 60
        ? [minutes, 'minute']
        : minutes < 1440
          ? [Math.round(minutes / 60), 'hour']
          : [Math.round(minutes / 1440), 'day'];
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-value, unit);
  };

  // Actualités réelles : le serveur agrège des flux RSS de sites d'actualité cyber.
  const loadLive = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { updatedAt: string; articles: LiveFeedItem[] } = await res.json();
      const preferred = data.articles.filter((a) =>
        language === 'fr' ? a.lang === 'fr' : a.lang === 'en',
      );
      const items = preferred.length >= 3 ? preferred : data.articles;
      if (items.length === 0) throw new Error('empty');
      setArticles(
        items.map((a) => ({
          id: a.id,
          title: a.title,
          category: categoryMap[a.category],
          timeAgo: '',
          readTime: a.source,
          author: a.source,
          tag: a.source,
          image: FALLBACK_IMAGE,
          summary: a.summary,
          content: a.summary ? [a.summary] : [],
          keyPoints: [],
          url: a.url,
          source: a.source,
          publishedAt: a.publishedAt,
        })),
      );
      setIsLive(true);
      setLastRefreshed(
        t('news.updated_at', 'Mis à jour à') +
          ' ' +
          new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      );
    } catch {
      setIsLive(false);
      setLastRefreshed(t('news.offline', 'Flux en direct indisponible — articles locaux'));
    } finally {
      setNow(Date.now());
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleRefresh = () => void loadLive();

  // Chargement initial, puis actualisation automatique toutes les 5 minutes.
  useEffect(() => {
    void loadLive();
    const timer = setInterval(() => void loadLive(), 5 * 60_000);
    return () => clearInterval(timer);
  }, [loadLive]);

  // Met à jour les libellés « il y a X min » chaque minute.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const filteredArticles = articles.filter((art) => {
    if (activeCategory === 'all') return true;
    return art.category === categoryMap[activeCategory];
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
            {isLive && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase">
                <Radio className="w-3 h-3 animate-pulse text-rose-700" />
                <span>{t('news.live_badge', 'LIVE')}</span>
              </span>
            )}
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
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-700' : ''}`}
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
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                {latestThreat?.publishedAt
                  ? `${t('news.urgent_alert', 'Alerte Urgence Cyber')} • ${relativeTime(latestThreat.publishedAt)}`
                  : L('Rappel de vigilance', 'Vigilance reminder', 'Recordatorio de vigilancia')}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {latestThreat
                ? latestThreat.title
                : L(
                    'Ne partagez jamais un code reçu par SMS, un code PIN ou un mot de passe : aucune banque ni aucun service ne vous le demandera.',
                    'Never share an SMS code, PIN or password: no bank or service will ever ask you for it.',
                    'No comparta nunca un código recibido por SMS, un PIN o una contraseña: ningún banco ni servicio se lo pedirá.',
                  )}
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
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${
              !vigilance
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                : vigilance.level === 'high'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : vigilance.level === 'medium'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {vigilance ? vigilance.score : '—'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {L(
                  'Indice de vigilance cyber',
                  'Cyber vigilance index',
                  'Índice de vigilancia cibernética',
                )}
              </span>
              {vigilance && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                  {vigilance.level === 'high'
                    ? L('ÉLEVÉ', 'HIGH', 'ALTO')
                    : vigilance.level === 'medium'
                      ? L('MODÉRÉ', 'MODERATE', 'MODERADO')
                      : L('FAIBLE', 'LOW', 'BAJO')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {vigilance
                ? L(
                    `${vigilance.threats} article(s) sur les menaces parmi ${vigilance.total} publiés ces dernières 24 h (${vigilance.sources} sources).`,
                    `${vigilance.threats} threat article(s) out of ${vigilance.total} published in the last 24 h (${vigilance.sources} sources).`,
                    `${vigilance.threats} artículo(s) sobre amenazas de ${vigilance.total} publicados en las últimas 24 h (${vigilance.sources} fuentes).`,
                  )
                : L(
                    'Indisponible : le flux d’actualités en direct n’est pas joignable.',
                    'Unavailable: the live news feed cannot be reached.',
                    'No disponible: no se puede acceder a las noticias en directo.',
                  )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <Scan className="w-3.5 h-3.5 text-sky-700" />
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
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap pl-2">
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
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  {article.publishedAt ? relativeTime(article.publishedAt) : article.timeAgo}
                </span>
                <span>•</span>
                <span className="text-sky-700 dark:text-sky-400/90 font-semibold">
                  {article.readTime}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
                  {article.tag}
                </span>
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
