import React, { useState } from 'react';
import { NewsArticle } from '../types';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Share2,
  CheckCircle2,
  Shield,
  Clock,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { isBookmarked, toggleBookmark } from '../services/persistenceService';

interface ArticleDetailModalProps {
  article: NewsArticle | null;
  onClose: () => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ article, onClose }) => {
  const [saved, setSaved] = useState(() => (article ? isBookmarked(article.id) : false));
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const handleBookmark = () => {
    const next = toggleBookmark(article.id);
    setSaved(next);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: window.location.href,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      navigator.clipboard.writeText(`${article.title} - ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 max-h-[92vh] flex flex-col">
        {/* Navigation Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
          <button
            onClick={onClose}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">Retour</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`p-2.5 rounded-xl transition-all ${
                saved
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 text-sky-400 fill-sky-400" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Partager cet article"
            >
              <Share2 className="w-4 h-4" />
              {copied && <span className="text-[10px] text-emerald-400 font-bold">Copié !</span>}
            </button>
          </div>
        </div>

        {/* Article Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Hero Illustration */}
          <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden border border-slate-700 shadow-xl bg-slate-950">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500 text-slate-950 text-xs font-bold shadow-md">
                {article.category}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-700 flex items-center justify-center text-white text-[10px] font-bold">
                  CS
                </div>
                <span>Par {article.author}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.readTime}</span>
              </div>
            </div>
          </div>

          {/* Title & Tag */}
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 mb-2">
              <Tag className="w-3 h-3" />
              <span>{article.tag}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {article.title}
            </h1>
          </div>

          {/* Lead Summary */}
          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/40 text-sm text-sky-200 leading-relaxed font-medium">
            {article.summary}
          </div>

          {/* Content Paragraphs */}
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            {article.content.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Lire l’article complet sur {article.source}
            </a>
          )}

          {/* Points Clés Section */}
          {article.keyPoints.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700 space-y-3.5">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Shield className="w-5 h-5 text-sky-400" />
                <h3>Points clés</h3>
              </div>
              <ul className="space-y-2.5">
                {article.keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-xs sm:text-sm text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer Action */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-lg shadow-sky-600/30"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
