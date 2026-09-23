import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Scan,
  Sparkles,
  Check,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { PhishingAnalysisResult } from '../types';

interface PhishingScannerModalProps {
  onClose: () => void;
}

export const PhishingScannerModal: React.FC<PhishingScannerModalProps> = ({ onClose }) => {
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<PhishingAnalysisResult | null>(null);

  const sampleAttacks = [
    {
      title: 'SMS Orange Money fictif',
      text: 'Cher client, votre compte Orange Money a ete suspendu suite a une tentative frauduleuse. Rendez-vous durgence sur http://om-securite-connexion.net/reactiver pour debloquer vos fonds.',
    },
    {
      title: 'Alerte Faux Colis',
      text: 'Chronopost : Votre colis 873919-FR n a pas pu etre livre en raison de frais de douane de 2,40€. Reglez immediatement sur http://chronopost-taxes-suivi.cc sous 24h.',
    },
    {
      title: 'Gain Tirage WhatsApp',
      text: 'FELICITATIONS ! Votre numero a ete tire au sort par la Loterie Internationale 2026. Vous remportez 15.000.000 FCFA. Envoyez vite votre code secret et CNI a l agent par WhatsApp.',
    },
  ];

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    setResult(null);

    setTimeout(() => {
      const lower = inputText.toLowerCase();
      let dangerScore = 15;
      const flags: string[] = [];
      const recommendations: string[] = [];

      // Phishing heuristics
      if (
        lower.includes('urgent') ||
        lower.includes('durgence') ||
        lower.includes('immediat') ||
        lower.includes('suspendu') ||
        lower.includes('bloqu')
      ) {
        dangerScore += 30;
        flags.push(
          'Urgence artificielle conçue pour provoquer la panique et empêcher la réflexion',
        );
      }

      if (
        lower.includes('http://') ||
        lower.includes('.cc') ||
        lower.includes('.tk') ||
        lower.includes('.net') ||
        lower.includes('bit.ly') ||
        lower.includes('-securite')
      ) {
        dangerScore += 35;
        flags.push('Lien web suspect ou domaine trompeur usurpant une institution officielle');
      }

      if (
        lower.includes('code secret') ||
        lower.includes('code pin') ||
        lower.includes('mot de passe') ||
        lower.includes('cni') ||
        lower.includes('identifiant')
      ) {
        dangerScore += 30;
        flags.push('Demande directe de données ultra-sensibles ou de codes secrets de sécurité');
      }

      if (
        lower.includes('felicitation') ||
        lower.includes('gagnant') ||
        lower.includes('loterie') ||
        lower.includes('remportez') ||
        lower.includes('fcfa')
      ) {
        dangerScore += 25;
        flags.push('Promesse de gain mirobolant ou loterie à laquelle vous n’avez jamais souscrit');
      }

      if (
        lower.includes('orange money') ||
        lower.includes('moov') ||
        lower.includes('wave') ||
        lower.includes('banque') ||
        lower.includes('paypal')
      ) {
        if (dangerScore > 30) {
          flags.push('Usurpation d’identité d’un opérateur financier ou bancaire de confiance');
        }
      }

      dangerScore = Math.min(98, Math.max(12, dangerScore));

      let verdict: PhishingAnalysisResult['verdict'] = 'Légitime';
      if (dangerScore > 65) {
        verdict = 'Hautement Dangereux (Phishing)';
        recommendations.push('Ne cliquez en aucun cas sur les liens présents dans ce message.');
        recommendations.push(
          'Ne partagez JAMAIS votre code secret ou code PIN, même à un prétendu agent.',
        );
        recommendations.push(
          'Supprimez le message et signalez le numéro expéditeur aux autorités compétentes.',
        );
      } else if (dangerScore > 35) {
        verdict = 'Suspect';
        recommendations.push(
          'Prenez contact directement avec l’expéditeur via son site ou son numéro officiel.',
        );
        recommendations.push(
          'Vérifiez l’URL exacte dans un navigateur indépendant sans cliquer directement.',
        );
      } else {
        verdict = 'Légitime';
        recommendations.push(
          'Aucun signal flagrant de fraude détecté, restez tout de même vigilant quant aux liens externes.',
        );
      }

      setResult({
        scoreDanger: dangerScore,
        verdict,
        flags:
          flags.length > 0
            ? flags
            : ['Structure et vocabulaire sans indicateur flagrant d’attaque'],
        recommendations,
      });
      setIsScanning(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Scanner Anti-Phishing & Arnaques IA
              </h3>
              <p className="text-[10px] text-slate-500">
                Innovation CyberSens • Analyseur de messages frauduleux
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Collez le texte du SMS, e-mail ou lien douteux reçu :
            </label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ex: Cher client, votre compte a été débité de 25.000 FCFA. Cliquez ici pour contester..."
              className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Quick Examples */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
              Ou testez un cas concret d'attaque réel :
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleAttacks.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(s.text)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-500 text-[10px] font-semibold transition-colors"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze CTA */}
          <button
            onClick={handleAnalyze}
            disabled={isScanning || !inputText.trim()}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyse heuristique en cours...</span>
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                <span>Lancer l'analyse de dangerosité</span>
              </>
            )}
          </button>

          {/* Result Card */}
          {result && (
            <div className="space-y-3.5 pt-2 animate-in fade-in duration-300">
              {/* Verdict Header */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  result.scoreDanger > 65
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : result.scoreDanger > 35
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.scoreDanger > 65 ? (
                    <ShieldAlert className="w-7 h-7 text-rose-600 shrink-0" />
                  ) : result.scoreDanger > 35 ? (
                    <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Verdict de l'Analyseur
                    </span>
                    <h4 className="text-sm font-black">{result.verdict}</h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black">{result.scoreDanger}%</span>
                  <span className="text-[10px] block opacity-80">Risque estimé</span>
                </div>
              </div>

              {/* Flags list */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                  Indicateurs de compromission détectés ({result.flags.length}) :
                </span>
                <ul className="space-y-1">
                  {result.flags.map((flag, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-[11px]"
                    >
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-1.5">
                <span className="font-bold text-sky-900 dark:text-sky-300 block text-xs">
                  Recommandations immédiates :
                </span>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-1.5 text-sky-800 dark:text-sky-200 text-[11px]"
                    >
                      <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
