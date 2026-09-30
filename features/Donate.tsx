import React from 'react';
import { HeartHandshake, ShieldCheck, ArrowRight, Gift } from 'lucide-react';
import { useI18n } from '../services/i18n';

interface DonateProps {
  onBack: () => void;
}

const Donate: React.FC<DonateProps> = ({ onBack }) => {
  const { t } = useI18n();

  const donationCards = [
    {
      title: t('donate.card_training_title', 'Formations'),
      desc: t('donate.card_training_desc', 'Créer de nouveaux parcours'),
      icon: ShieldCheck,
    },
    {
      title: t('donate.card_simulations_title', 'Simulations'),
      desc: t('donate.card_simulations_desc', 'Développer des scénarios réalistes'),
      icon: Gift,
    },
    {
      title: t('donate.card_accessibility_title', 'Accessibilité'),
      desc: t('donate.card_accessibility_desc', 'Rendre la formation plus utile'),
      icon: ArrowRight,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 py-6 md:px-0 md:py-8">
      <div className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-slate-900 to-emerald-500/10 p-5 md:p-8 shadow-2xl shadow-sky-500/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-700 text-white shadow-lg shadow-sky-500/30">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300 font-bold">
                {t('donate.eyebrow', 'Soutenez')}
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {t('donate.title', 'Acheter le livre')}
              </h1>
            </div>
          </div>

          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/70 text-sm font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-300 transition-colors"
          >
            {t('donate.back', 'Revenir')}
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5 space-y-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-300 font-black">
                  {t('donate.hook_label', 'L’outil qui change la vigilance')}
                </p>
                <p className="mt-2 text-xl font-black text-white leading-snug">
                  {t(
                    'donate.hook',
                    'L’IA peut attaquer… mais elle peut aussi vous aider à vous protéger avant qu’il soit trop tard.',
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-sky-300 font-bold">
                  {t('donate.book_title', 'La Guerre invisible : IA et cybersécurité')}
                </p>
                <p className="mt-2 text-slate-300 leading-7">
                  {t(
                    'donate.book_value',
                    'Ce livre explique comment l’intelligence artificielle renforce les attaques, les arnaques et les fraudes, tout en montrant concrètement les moyens de se protéger, d’anticiper les menaces et d’agir avant qu’un incident ne devienne catastrophique.',
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <p className="text-sm font-black text-sky-200">
                  {t('donate.book_summary_title', 'Sommaire')}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {t(
                    'donate.book_summary',
                    'Partie I — Comprendre les fondations | Partie II — L’IA comme arme | Partie III — L’IA comme bouclier | Partie IV — Se défendre concrètement | Partie V — Annexes pratiques et ressources',
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm font-black text-emerald-200">
                  {t('donate.why_title', 'Pourquoi ce livre est important')}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {t(
                    'donate.why_text',
                    'Parce que la cybersécurité ne se joue plus seulement sur des logiciels : elle dépend aussi de la vigilance humaine, du bon réflexe et de la compréhension des outils que les attaquants utilisent aujourd’hui.',
                  )}
                </p>
              </div>

              <p className="text-slate-300 leading-7">
                {t(
                  'donate.description',
                  'Chaque achat de ce livre soutient CyberSens, finance de nouveaux contenus pédagogiques et aide à former plus de personnes à la cybersécurité avec des méthodes concrètes et accessibles.',
                )}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {donationCards.map(({ title, desc, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-sky-500/10 p-2 text-sky-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-white">{title}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/15 via-slate-900 to-sky-500/10 p-5 shadow-xl shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300 font-bold">
              {t('donate.contribution', 'Support')}
            </p>
            <div className="mt-4 text-3xl font-black text-white">
              {t('donate.amount', '15 000 FCFA')}
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {t('donate.amount_hint', 'Le prix de la connaissance, à l’accessibilité de chacun')}
            </div>

            <a
              href="https://mxildbzj.mychariow.shop/prd_xww4mhs0"
              target="_blank"
              rel="noreferrer"
              className="mt-5 block w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-sky-500 px-4 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.01] hover:shadow-emerald-500/35 transition-all"
            >
              {t('donate.cta', 'Acheter le livre')}
            </a>

            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100 font-semibold">
              {t(
                'donate.reassurance',
                'Paiement simple, achat sécurisé, toutes méthodes de paiement autorisées et soutien direct à CyberSens.',
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-300">
              {t(
                'donate.note',
                'Achetez le livre et soutenez directement CyberSens pour financer de nouveaux cours, ateliers, simulations et contenus pédagogiques.',
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donate;
