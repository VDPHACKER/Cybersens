import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, Check, X, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'profile' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled) {
    if (variant === 'profile') {
      return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Application PWA installée sur cet appareil</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] uppercase font-bold">
            Actif
          </span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) setInstallSuccess(true);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback for browsers without direct prompt event: show helpful instructions
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all active:scale-95"
          title="Installer CyberSens sur votre écran d'accueil"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer l'app</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'hero' && (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white text-sm font-bold shadow-xl shadow-sky-600/30 hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Installer CyberSens sur mobile / bureau</span>
        </button>
      )}

      {variant === 'profile' && (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-800 dark:text-sky-300 text-xs font-semibold transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 dark:text-white">
                Installer comme application (PWA)
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-400">
                Accès hors ligne, plein écran sans navigateur
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-sky-500 text-slate-950 font-bold text-[10px]">
            Installer
          </span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleInstallClick}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sky-400 border border-slate-700"
          title="Installer l'application PWA"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {/* iOS / Browser Guided Installation Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-sky-500/30 p-1 bg-slate-950 flex items-center justify-center">
                <img src="/favicon.svg" alt="CyberSens" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Installer CyberSens</h3>
                <p className="text-xs text-sky-400">Application PWA officielle</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div>
                  Sur <strong>Safari iOS</strong>, appuyez sur le bouton <strong>Partager</strong>{' '}
                  <Share2 className="w-3.5 h-3.5 inline text-sky-400 mx-0.5" /> dans la barre de
                  navigation.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <div>
                  Faites défiler puis touchez <strong>« Sur l'écran d'accueil »</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline text-sky-400 mx-0.5" />.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <div>
                  Sur <strong>Chrome / Edge</strong>, cliquez sur l'icône d'installation dans la
                  barre d'adresse ou menu ⋮ → <strong>Installer l'application</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-all"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
