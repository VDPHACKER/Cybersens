import React, { useState } from 'react';
import { ArrowRight, BookOpen, Shield, Users, CheckCircle2 } from 'lucide-react';
import { LanguageSelector, useI18n } from '../services/i18n';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  useI18n();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Apprendre simplement',
      desc: 'Des micro-formations et quiz clairs adaptés à tous les niveaux sans jargon technique.',
      icon: BookOpen,
      color: 'text-sky-400',
      bg: 'bg-sky-500/20',
    },
    {
      title: 'Adopter les bons réflexes',
      desc: 'Mots de passe forts, double authentification, détection du phishing et protection mobile.',
      icon: Shield,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
    },
    {
      title: 'Protéger notre communauté',
      desc: 'Partagez les alertes avec vos proches et contribuez à un numérique africain et mondial plus sûr.',
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 flex flex-col justify-between p-6 sm:p-10 max-w-md mx-auto min-h-screen text-slate-100 overflow-y-auto">
      <LanguageSelector className="fixed top-4 right-4 z-[100]" />
      {/* Top Brand Block */}
      <div className="flex flex-col items-center text-center pt-8 sm:pt-12">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-6 rounded-3xl p-1 bg-slate-950 border border-sky-500/40 shadow-2xl shadow-sky-500/30 flex items-center justify-center animate-float">
          <img src="/favicon.svg" alt="CyberSens" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-1">
          Cyber<span className="text-sky-400">Sens</span>
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest font-extrabold text-sky-400">
          Sensibiliser • Protéger • Agir
        </p>
        <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
          Une communauté plus sûre, un numérique plus responsable.
        </p>
      </div>

      {/* Middle Value Props Slides */}
      <div className="my-8 space-y-4">
        {slides.map((slide, idx) => {
          const Icon = slide.icon;
          const isActive = idx === activeSlide;
          return (
            <div
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-sky-500/60 shadow-lg shadow-sky-500/10 scale-[1.02]'
                  : 'bg-slate-900/40 border-slate-800/60 opacity-70 hover:opacity-100'
              }`}
            >
              <div className={`p-3 rounded-xl ${slide.bg} ${slide.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-white">{slide.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">{slide.desc}</p>
              </div>
            </div>
          );
        })}

        {/* Slide Dots */}
        <div className="flex justify-center items-center gap-2 pt-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`h-2 rounded-full transition-all ${
                activeSlide === idx ? 'w-6 bg-sky-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="space-y-4 pb-4">
        <div className="text-center">
          <p className="text-xs text-sky-300 font-medium italic">
            « La sécurité commence par toi ! »
          </p>
        </div>

        <button
          onClick={onComplete}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-extrabold text-sm shadow-xl shadow-sky-600/30 active:scale-[0.98] transition-all"
        >
          <span>Commencer</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
