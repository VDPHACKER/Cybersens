import React, { useState, useEffect } from 'react';
import { useI18n } from '../services/i18n';

interface AboutProps {
  onBack: () => void;
}

const About: React.FC<AboutProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const [currentUrl, setCurrentUrl] = useState('');
  const [isApiConfigured, setIsApiConfigured] = useState(false);
  const [bootSequence, setBootSequence] = useState<string[]>([]);

  // La clé reste sur le serveur : on interroge seulement le relais pour savoir si l'IA est configurée
  useEffect(() => {
    let cancelled = false;
    fetch('/api/gemini/status')
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .catch(() => ({ configured: false }))
      .then((data) => {
        if (!cancelled) setIsApiConfigured(data?.configured === true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCurrentUrl(window.location.href);
    const key = isApiConfigured;

    const sequenceFr = [
      "> Initialisation de l'infrastructure...",
      '> Vérification des dépendances node-modules...',
      '> [INFO] node-domexception: Déprécié mais sans impact.',
      '> Compilation des modules React 19...',
      '> ' + (key ? 'LIAISON API GEMINI : OK' : 'ERREUR : API_KEY NON DÉTECTÉE'),
      '> STATUT : PRÊT POUR LA PRODUCTION.',
    ];

    const sequenceEn = [
      '> Initializing infrastructure...',
      '> Checking node-modules dependencies...',
      '> [INFO] node-domexception: Deprecated but non-blocking.',
      '> Compiling React 19 modules...',
      '> ' + (key ? 'GEMINI API LINK : OK' : 'ERROR: API_KEY NOT DETECTED'),
      '> STATUS: READY FOR PRODUCTION.',
    ];

    const sequenceEs = [
      '> Inicializando infraestructura...',
      '> Verificando dependencias node-modules...',
      '> [INFO] node-domexception: En desuso pero sin impacto.',
      '> Compilando módulos React 19...',
      '> ' + (key ? 'ENLACE API GEMINI : OK' : 'ERROR : API_KEY NO DETECTADA'),
      '> ESTADO : LISTO PARA PRODUCCIÓN.',
    ];

    const sequence = language === 'en' ? sequenceEn : language === 'es' ? sequenceEs : sequenceFr;

    let i = 0;
    setBootSequence([]);
    const interval = setInterval(() => {
      if (i < sequence.length) {
        const nextLine = sequence[i];
        if (nextLine) {
          setBootSequence((prev) => [...prev, nextLine]);
        }
        i++;
      } else {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [language, isApiConfigured]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUrl);
    const msg =
      language === 'en'
        ? 'Deployment link copied!'
        : language === 'es'
          ? '¡Enlace de despliegue copiado!'
          : 'Lien de déploiement copié !';

    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: { message: msg, type: 'success' },
      }),
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-cyan-500 transition-colors font-black text-[10px] uppercase tracking-[0.3em] w-fit px-2"
      >
        <span className="text-xl">←</span> {t('common.back_to_hub', 'Retour au Hub')}
      </button>

      <div className="text-center space-y-4">
        <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter uppercase text-white drop-shadow-lg">
          CyberAI <span className="text-cyan-500">Deploy</span>
        </h2>
        <p className="text-slate-400 text-xl font-medium">
          {language === 'en'
            ? 'Infrastructure and deployment guide for VDPHACKER.'
            : language === 'es'
              ? 'Guía de infraestructura para VDPHACKER.'
              : "Guide d'infrastructure pour VDPHACKER."}
        </p>
      </div>

      {/* Terminal de Statut */}
      <div className="bg-black rounded-[2rem] border-2 border-slate-800 p-6 md:p-8 font-mono shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/20"></div>
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <span className="text-[10px] text-slate-500 font-black ml-4 uppercase tracking-widest">
              Diagnostic_Console
            </span>
          </div>
          <div className="text-[10px] text-emerald-500/50 font-black animate-pulse">
            SYSTEM_STABLE
          </div>
        </div>
        <div className="space-y-2">
          {bootSequence.filter(Boolean).map((line, idx) => (
            <div
              key={idx}
              className={`text-sm ${
                line?.includes('ERREUR') || line?.includes('ERROR')
                  ? 'text-red-400'
                  : line?.includes('INFO')
                    ? 'text-yellow-400/70 italic'
                    : line?.includes('OK') ||
                        line?.includes('PRÊT') ||
                        line?.includes('READY') ||
                        line?.includes('LISTO')
                      ? 'text-emerald-400'
                      : 'text-cyan-400'
              }`}
            >
              {line}
            </div>
          ))}
          <div className="w-2 h-4 bg-cyan-500 animate-pulse inline-block"></div>
        </div>
      </div>

      {/* Section Dépannage NPM */}
      <div className="bg-slate-900/50 border-2 border-slate-800 p-8 rounded-[3rem] shadow-xl">
        <h3 className="text-2xl font-black text-white mb-4 uppercase italic flex items-center gap-3">
          <span className="text-yellow-500">⚠️</span>{' '}
          {language === 'en'
            ? 'Note on Dependency Warnings'
            : language === 'es'
              ? 'Nota sobre advertencias'
              : 'Note sur les "Warnings"'}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          {language === 'en' ? (
            <>
              If you see a{' '}
              <code className="text-yellow-500 bg-black px-2 py-0.5 rounded">
                npm warn deprecated node-domexception
              </code>{' '}
              message,
              <strong> don’t worry</strong>. This is a minor warning related to internal Node.js
              dependencies. Your application functions flawlessly in all modern browsers on Vercel,
              Netlify, or Cloud Run.
            </>
          ) : language === 'es' ? (
            <>
              Si ves un aviso{' '}
              <code className="text-yellow-500 bg-black px-2 py-0.5 rounded">
                npm warn deprecated node-domexception
              </code>
              ,<strong> no te preocupes</strong>. Es una advertencia menor ligada a dependencias de
              Node.js. Tu aplicación funcionará perfectamente una vez desplegada en Vercel o Netlify
              en el navegador.
            </>
          ) : (
            <>
              Si tu vois un message{' '}
              <code className="text-yellow-500 bg-black px-2 py-0.5 rounded">
                npm warn deprecated node-domexception
              </code>
              ,<strong>ne t'inquiète pas</strong>. C'est un avertissement mineur lié aux dépendances
              internes de Node.js. Ton application fonctionnera parfaitement une fois déployée sur
              Vercel ou Netlify car elle s'exécute dans le navigateur, pas sur le serveur.
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[3rem] shadow-xl">
          <h3 className="text-2xl font-black text-white mb-6 uppercase italic">
            {language === 'en'
              ? 'Deployment Process'
              : language === 'es'
                ? 'Proceso de Despliegue'
                : 'Processus de Déploiement'}
          </h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-white shrink-0 shadow-lg">
                1
              </div>
              <p className="text-slate-400 text-sm">
                <strong className="text-white">Push to GitHub:</strong>{' '}
                {language === 'en'
                  ? 'Create a repo and commit your project files.'
                  : language === 'es'
                    ? 'Crea un repositorio y sube tus archivos.'
                    : 'Crée un nouveau dépôt et envoie tous tes fichiers.'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-white shrink-0 shadow-lg">
                2
              </div>
              <p className="text-slate-400 text-sm">
                <strong className="text-white">Import Vercel / Cloud:</strong>{' '}
                {language === 'en'
                  ? 'Connect your Git provider to Vercel or Cloud Run.'
                  : language === 'es'
                    ? 'Conecta tu Git a Vercel o Cloud Run.'
                    : 'Connecte ton GitHub à Vercel et sélectionne le projet.'}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center font-black text-white shrink-0 shadow-lg">
                3
              </div>
              <p className="text-slate-400 text-sm">
                <strong className="text-white">Env Variables:</strong>{' '}
                {language === 'en'
                  ? 'Add API_KEY in project settings.'
                  : language === 'es'
                    ? 'Añade API_KEY en la configuración.'
                    : 'Ajoute API_KEY dans les paramètres de déploiement.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[3rem] shadow-xl flex flex-col justify-center items-center text-center">
          <h3 className="text-xl font-black text-white mb-4 uppercase">
            {language === 'en'
              ? 'Share the Interface'
              : language === 'es'
                ? 'Comparte la Interfaz'
                : "Partagez l'Interface"}
          </h3>
          <div className="p-4 bg-white rounded-3xl mb-6 shadow-2xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`}
              className="w-24 h-24"
              alt="QR Code"
            />
          </div>
          <button
            onClick={copyToClipboard}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black transition-all active:scale-95 italic uppercase tracking-widest shadow-xl shadow-cyan-600/20"
          >
            {language === 'en'
              ? 'COPY SITE URL'
              : language === 'es'
                ? 'COPIAR URL DEL SITIO'
                : "COPIER L'URL DU SITE"}
          </button>
        </div>
      </div>

      <div className="text-center opacity-30 pb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
          CyberAI Infrastructure Protocol v2.6.8 - Développeur: VDPHACKER
        </p>
      </div>
    </div>
  );
};

export default About;
