import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HeartHandshake, X, ExternalLink, ArrowRight } from 'lucide-react';
import { AppTab } from '../types';
import { useI18n } from '../services/i18n';
import { BOOK_URL } from './DonateCard';
import { isDonatePopupMuted, muteDonatePopupToday } from '../services/donatePopup';

// Panneau latéral de don : apparaît toutes les minutes, reste 15 secondes, fermable à tout moment.
export const DONATE_POPUP_INTERVAL_MS = 60_000;
export const DONATE_POPUP_VISIBLE_MS = 15_000;

interface Props {
  activeTab: AppTab;
  onLearnMore: () => void;
}

export const DonatePopup: React.FC<Props> = ({ activeTab, onLearnMore }) => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // relance la barre de décompte à chaque (ré)armement
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTabRef = useRef(activeTab);
  const visibleRef = useRef(false);

  activeTabRef.current = activeTab;
  visibleRef.current = visible;

  const clearHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const armHide = useCallback(() => {
    clearHide();
    setCycle((c) => c + 1);
    hideTimer.current = setTimeout(() => setVisible(false), DONATE_POPUP_VISIBLE_MS);
  }, []);

  const close = useCallback(() => {
    clearHide();
    setPaused(false);
    setVisible(false);
  }, []);

  // Rythme : une apparition par minute, sauf onglet du navigateur caché, page de don ou panneau déjà ouvert
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden || visibleRef.current || activeTabRef.current === AppTab.DONATE) return;
      if (isDonatePopupMuted(window.localStorage)) return;
      setPaused(false);
      setVisible(true);
      armHide();
    }, DONATE_POPUP_INTERVAL_MS);
    return () => {
      clearInterval(id);
      clearHide();
    };
  }, [armHide]);

  // Arrivée sur la page de don : le panneau n'a plus lieu d'être
  useEffect(() => {
    if (activeTab === AppTab.DONATE) close();
  }, [activeTab, close]);

  // Échap ferme le panneau
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, close]);

  const muteToday = () => {
    muteDonatePopupToday(window.localStorage);
    close();
  };

  const pause = () => {
    clearHide();
    setPaused(true);
  };
  const resume = () => {
    setPaused(false);
    armHide();
  };

  if (!visible) return null;

  const ring =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

  return (
    <aside
      role="complementary"
      aria-label={t('donate.eyebrow', 'Soutenez')}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) resume();
      }}
      className="donate-popup fixed bottom-[76px] left-3 right-3 z-[120] overflow-hidden rounded-2xl border border-emerald-400/30 bg-ink-800 text-white shadow-2xl shadow-black/40 sm:left-auto sm:w-[22rem] lg:bottom-auto lg:right-6 lg:top-24"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/25 text-emerald-300">
            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
              {t('donate.eyebrow', 'Soutenez')}
            </p>
            <p className="text-sm font-black leading-tight">
              {t('donate.book_title', 'La Guerre invisible : IA et cybersécurité')}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {t('donate.amount', '15 000 FCFA')} ·{' '}
              {t('donate.reassurance_short', 'Achat sécurisé · soutien direct à CyberSens')}
            </p>
          </div>
          <button
            onClick={close}
            aria-label={t('donate.popup_close', 'Fermer')}
            className={`-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white ${ring}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <a
          href={BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-sky-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.01] ${ring}`}
        >
          {t('donate.cta', 'Acheter le livre')}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">(nouvel onglet)</span>
        </a>
        <button
          onClick={() => {
            close();
            onLearnMore();
          }}
          className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-200 transition-colors hover:bg-white/5 ${ring}`}
        >
          {t('donate.learn_more', 'En savoir plus')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={muteToday}
          className={`mt-0.5 block w-full rounded-lg px-3 py-1.5 text-center text-[11px] font-semibold text-slate-400 underline-offset-2 transition-colors hover:text-slate-200 hover:underline ${ring}`}
        >
          {t('donate.popup_mute', 'Ne plus afficher aujourd’hui')}
        </button>
      </div>

      {/* Décompte visuel des 15 secondes (figé quand le panneau est survolé ou focalisé) */}
      <div className="h-1 bg-white/10" aria-hidden="true">
        <div
          key={cycle}
          className="donate-countdown h-full bg-emerald-400"
          style={{ animationPlayState: paused ? 'paused' : 'running' }}
        />
      </div>
    </aside>
  );
};
