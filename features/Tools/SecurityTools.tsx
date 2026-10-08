import React, { useState, useEffect, useRef } from 'react';
import { addAuditLog, getAuditLogs, clearAuditLogs } from '../../services/persistenceService';
import { analyzeSecurityLog } from '../../services/geminiService';
import { AuditLogEntry } from '../../types';
import { useI18n } from '../../services/i18n';
import { DeepfakeTester } from '../../components/DeepfakeTester';
import { ImageMetadataTool } from '../../components/ImageMetadataTool';
import {
  ScanFace,
  FileSearch,
  ScanSearch,
  Link2,
  MailWarning,
  KeyRound,
  ClipboardList,
  ImagePlus,
  ShieldCheck,
  Flag,
  Bot,
} from 'lucide-react';

type ToolTab = 'deepfake' | 'metadata' | 'analyzer' | 'links' | 'email' | 'password' | 'audit';

const humanizeAiText = (raw: string) => {
  if (!raw) return '';
  return raw
    .replace(/###+\s*/g, '\n\n• ')
    .replace(/\*\*+/g, '')
    .replace(/[-*#_`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

interface SecurityToolsProps {
  onBack: () => void;
}

const SecurityTools: React.FC<SecurityToolsProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const [activeTool, setActiveTool] = useState<ToolTab>(() => {
    try {
      const wanted = sessionStorage.getItem('cybersens-open-tool');
      if (wanted) sessionStorage.removeItem('cybersens-open-tool');
      const valid: ToolTab[] = [
        'deepfake',
        'metadata',
        'analyzer',
        'links',
        'email',
        'password',
        'audit',
      ];
      return valid.includes(wanted as ToolTab) ? (wanted as ToolTab) : 'deepfake';
    } catch {
      return 'deepfake';
    }
  });

  const tools = [
    {
      id: 'deepfake',
      label:
        language === 'en'
          ? 'Deepfake Detector & Tester'
          : language === 'es'
            ? 'Detector de Deepfakes'
            : 'Testeur de Deepfakes IA',
      icon: ScanFace,
    },
    {
      id: 'metadata',
      label:
        language === 'en'
          ? 'Image Forensics'
          : language === 'es'
            ? 'Forense de Imagen'
            : 'Forensics d’Image',
      icon: FileSearch,
    },
    {
      id: 'analyzer',
      label:
        language === 'en' ? 'AI Log Audit' : language === 'es' ? 'Auditoría IA' : 'Audit Logs IA',
      icon: ScanSearch,
    },
    {
      id: 'links',
      label:
        language === 'en'
          ? 'Suspicious Link Checker'
          : language === 'es'
            ? 'Comprobador de Enlaces'
            : 'Testeur de Liens Douteux',
      icon: Link2,
    },
    {
      id: 'email',
      label:
        language === 'en'
          ? 'Phishing Email Scanner'
          : language === 'es'
            ? 'Escáner de Phishing'
            : 'Test Email de Phishing',
      icon: MailWarning,
    },
    {
      id: 'password',
      label:
        language === 'en'
          ? 'Password Strength Tester'
          : language === 'es'
            ? 'Medidor de Contraseñas'
            : 'Testeur de Mot de Passe',
      icon: KeyRound,
    },
    {
      id: 'audit',
      label: language === 'en' ? 'System Logs' : language === 'es' ? 'Registros' : 'Logs d’Audit',
      icon: ClipboardList,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-cyan-500 transition-colors font-black text-[10px] uppercase tracking-[0.3em] w-fit px-2"
      >
        <span className="text-xl">←</span> {t('common.back', 'Retour')}
      </button>

      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as ToolTab)}
            className={`flex-none px-3.5 py-2.5 md:px-4 md:py-2.5 rounded-xl font-bold transition-all border-2 whitespace-nowrap flex items-center gap-2 ${
              activeTool === tool.id
                ? 'bg-cyan-700 border-cyan-400 text-white shadow-lg shadow-cyan-600/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-600'
            }`}
          >
            <tool.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs md:text-sm">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="transition-all duration-300">
        {activeTool === 'deepfake' && <DeepfakeTester />}
        {activeTool === 'metadata' && <ImageMetadataTool />}
        {activeTool === 'analyzer' && <ExpertAIAnalyzer />}
        {activeTool === 'links' && <LinkAnalyzer />}
        {activeTool === 'email' && <EmailAnalyzer />}
        {activeTool === 'password' && <PasswordTester />}
        {activeTool === 'audit' && <AuditLogViewer />}
      </div>
    </div>
  );
};

const ExpertAIAnalyzer = () => {
  const { t, language } = useI18n();
  const [data, setData] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!data.trim() && !image) return;
    setIsAnalyzing(true);
    setReport(null);
    try {
      const imagePayload = image
        ? {
            data: image.split(',')[1],
            mimeType: image.split(';')[0].split(':')[1] || 'image/jpeg',
          }
        : undefined;

      const langPrompt =
        language === 'en'
          ? `Please perform the analysis in English.\n\nData to audit:\n${data}`
          : language === 'es'
            ? `Por favor realiza el análisis en español.\n\nDatos a auditar:\n${data}`
            : data;

      const result = await analyzeSecurityLog(langPrompt, imagePayload);
      setReport(
        result ||
          (language === 'en'
            ? 'No analysis generated.'
            : language === 'es'
              ? 'Sin análisis generado.'
              : 'Aucune analyse générée.'),
      );
      addAuditLog('Analyse de logs par IA effectuée', 'Sécurité', 'info');

      const notifyMsg =
        language === 'en'
          ? 'AI security audit completed.'
          : language === 'es'
            ? 'Auditoría IA completada con éxito.'
            : 'Audit IA terminé avec succès.';
      window.dispatchEvent(
        new CustomEvent('cyber-notify', {
          detail: { message: notifyMsg, type: 'success' },
        }),
      );
    } catch (err) {
      setReport(
        language === 'en'
          ? 'Error during security audit.'
          : language === 'es'
            ? 'Error durante el análisis.'
            : "Erreur lors de l'analyse.",
      );
      window.dispatchEvent(
        new CustomEvent('cyber-notify', {
          detail: { message: "Erreur de liaison IA durant l'audit.", type: 'error' },
        }),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl border-t-4 border-t-cyan-500">
      <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 dark:text-white uppercase tracking-tight">
        {language === 'en'
          ? 'AI Log & Security Audit'
          : language === 'es'
            ? 'Auditoría de Registros por IA'
            : 'Audit Logs & Sécurité IA'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6 md:mb-8 text-sm md:text-base">
        {language === 'en'
          ? 'Deep automated inspection of suspicious server logs, HTTP headers, or attack screenshots.'
          : language === 'es'
            ? 'Inspección automatizada de registros de servidor, encabezados HTTP o capturas sospechosas.'
            : "Analyse automatisée de logs serveur, d'en-têtes HTTP ou de captures d'écran suspectes."}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <textarea
          className="w-full h-48 md:h-64 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 font-mono text-xs md:text-sm outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 dark:text-slate-300"
          placeholder={
            language === 'en'
              ? 'Paste raw logs, HTTP requests, or command trace here...'
              : language === 'es'
                ? 'Pega registros, peticiones HTTP o trazas de comandos...'
                : 'Collez ici vos logs bruts, requêtes HTTP ou traces de commandes...'
          }
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="h-48 md:h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl md:rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/5 transition-all overflow-hidden"
        >
          {image ? (
            <img src={image} alt="Upload" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center p-4">
              <ImagePlus
                className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-4 mx-auto text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {language === 'en'
                  ? 'Click to upload screenshot / log image'
                  : language === 'es'
                    ? 'Haz clic para subir captura de pantalla'
                    : 'Importer une capture d’écran / image'}
              </p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <button
        disabled={isAnalyzing || (!data.trim() && !image)}
        onClick={runAnalysis}
        className="w-full py-4 md:py-5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg transition-all active:scale-95 disabled:opacity-50"
      >
        {isAnalyzing
          ? language === 'en'
            ? 'ANALYZING...'
            : language === 'es'
              ? 'ANALIZANDO...'
              : 'ANALYSE...'
          : language === 'en'
            ? 'START AI AUDIT'
            : language === 'es'
              ? 'INICIAR AUDITORÍA IA'
              : 'LANCER L’ANALYSE'}
      </button>

      {report && (
        <div className="mt-6 md:mt-8 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 rounded-xl md:rounded-2xl border border-cyan-500/20 animate-in slide-in-from-bottom-2">
          <h4 className="text-cyan-700 dark:text-cyan-400 font-black mb-3 md:mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px] md:text-xs">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />{' '}
            {language === 'en'
              ? 'Security Audit Report'
              : language === 'es'
                ? 'Informe de Auditoría'
                : 'Rapport d’Audit Sécurité'}
          </h4>
          <div className="text-slate-800 dark:text-slate-300 whitespace-pre-wrap text-xs md:text-sm leading-relaxed">
            {report}
          </div>
        </div>
      )}
    </div>
  );
};

const RiskDisplay = ({ result }: { result: any }) => {
  const { language } = useI18n();
  return (
    <div className="animate-in fade-in pt-6 md:pt-8">
      <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800">
        <div
          className={`w-14 h-14 md:w-20 md:h-20 rounded-full border-4 md:border-8 flex items-center justify-center text-sm md:text-lg font-black shrink-0 ${
            result.risk > 50
              ? 'border-red-500 text-red-500'
              : result.risk > 0
                ? 'border-orange-500 text-orange-500'
                : 'border-emerald-500 text-emerald-500'
          }`}
        >
          {result.risk}%
        </div>
        <div>
          <h4 className="text-base md:text-xl font-bold dark:text-white">
            {language === 'en'
              ? 'Estimated Threat Level'
              : language === 'es'
                ? 'Nivel de Amenaza Estimado'
                : 'Indice de Risque'}
          </h4>
          <p className="text-xs text-slate-500">
            {result.risk > 50
              ? language === 'en'
                ? 'Critical threat detected'
                : language === 'es'
                  ? 'Amenaza crítica detectada'
                  : 'Danger critique détecté'
              : language === 'en'
                ? 'Acceptable profile'
                : language === 'es'
                  ? 'Perfil aceptable'
                  : 'Profil acceptable'}
          </p>
        </div>
      </div>
      <div className="space-y-2 md:space-y-3">
        {result.findings.map((f: string, i: number) => (
          <div
            key={i}
            className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-white dark:bg-slate-800 rounded-lg md:rounded-xl border border-red-500/10"
          >
            <Flag className="w-4 h-4 shrink-0 text-red-500" aria-hidden="true" />
            <span className="text-xs md:text-sm font-bold dark:text-slate-200">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LinkAnalyzer = () => {
  const { language } = useI18n();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const analyze = async () => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    setAiReport(null);
    const findings = [];
    let risk = 0;
    const cleanUrl = (url || '').trim().toLowerCase();

    if (cleanUrl.startsWith('http://')) {
      findings.push(
        language === 'en'
          ? 'Unencrypted HTTP protocol (cleartext)'
          : language === 'es'
            ? 'Protocolo HTTP no seguro'
            : 'Protocole HTTP non sécurisé',
      );
      risk += 40;
    }
    if (cleanUrl.includes('bit.ly') || cleanUrl.includes('tinyurl') || cleanUrl.includes('t.co')) {
      findings.push(
        language === 'en'
          ? 'Shortened / obfuscated redirection'
          : language === 'es'
            ? 'Redirección oculta o acortada'
            : 'Redirection masquée',
      );
      risk += 20;
    }
    if (/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/.test(cleanUrl)) {
      findings.push(
        language === 'en'
          ? 'Raw IP address instead of domain name'
          : language === 'es'
            ? 'Dirección IP directa en lugar de dominio'
            : "IP brute détectée sans nom d'hôte",
      );
      risk += 50;
    }
    if (cleanUrl.includes('@') || cleanUrl.includes('%2e%2e')) {
      findings.push(
        language === 'en'
          ? 'URL credential spoofing syntax'
          : language === 'es'
            ? 'Sintaxis sospechosa de suplantación'
            : "Syntaxe suspecte d'usurpation d'URL",
      );
      risk += 40;
    }
    if (
      cleanUrl.includes('-bf') ||
      cleanUrl.includes('-auth') ||
      cleanUrl.includes('-secure') ||
      cleanUrl.includes('-login') ||
      cleanUrl.includes('-support') ||
      cleanUrl.includes('account/signup') ||
      cleanUrl.includes('energy') ||
      cleanUrl.includes('bank')
    ) {
      findings.push(
        language === 'en'
          ? 'Suspicious domain suffix or credential harvesting path (Typosquatting / Brand Impersonation risk)'
          : language === 'es'
            ? 'Sufijo de dominio sospechoso o ruta de recolección de credenciales'
            : 'Suffixe de domaine suspect ou chemin de collecte d’identifiants (Typosquatting / Phishing)',
      );
      risk += 60;
    }

    try {
      const aiResult = await analyzeSecurityLog(
        `Analyse cette URL suspecte pour détecter du phishing, du typosquatting, du brand impersonation (usurpation de marque) ou une arnaque financière : ${url}`,
      );
      setAiReport(aiResult);
      if (
        aiResult &&
        (aiResult.toLowerCase().includes('critique') ||
          aiResult.toLowerCase().includes('élevé') ||
          aiResult.toLowerCase().includes('phishing') ||
          aiResult.toLowerCase().includes('suspect') ||
          aiResult.toLowerCase().includes('arnaque'))
      ) {
        risk = Math.max(risk, 88);
      }
    } catch {
      // fallback
    }

    setResult({ risk: Math.min(risk, 100), findings });
    setIsAnalyzing(false);
    addAuditLog(`Analyse URL`, 'Sécurité', risk > 40 ? 'warning' : 'info');

    const notifyMsg =
      risk > 40
        ? language === 'en'
          ? 'Threat detected in URL!'
          : language === 'es'
            ? '¡Amenaza detectada en la URL!'
            : "Menace détectée dans l'URL !"
        : language === 'en'
          ? 'URL analyzed.'
          : language === 'es'
            ? 'URL analizada.'
            : 'Lien analysé.';

    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: {
          message: notifyMsg,
          type: risk > 40 ? 'warning' : 'info',
        },
      }),
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl border-t-4 border-t-blue-500 space-y-6">
      <div>
        <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 dark:text-white uppercase tracking-tight">
          {language === 'en'
            ? 'Suspicious URL & Domain Checker'
            : language === 'es'
              ? 'Comprobador de Enlaces y Dominios'
              : 'Testeur de Liens & Domaines Suspects'}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {language === 'en'
            ? 'Detect obfuscated addresses, typosquatting, brand impersonation, and phishing paths using Gemini AI.'
            : language === 'es'
              ? 'Detecta direcciones ofuscadas, typosquatting y suplantación de marca con Gemini IA.'
              : 'Détectez les adresses masquées, le typosquatting, l’usurpation de marque et les liens de phishing grâce à l’IA Gemini.'}
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-slate-800 dark:text-white font-mono text-sm"
        />
        <button
          onClick={analyze}
          disabled={isAnalyzing}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>
                {language === 'en'
                  ? 'ANALYZING...'
                  : language === 'es'
                    ? 'ANALIZANDO...'
                    : 'ANALYSE...'}
              </span>
            </>
          ) : (
            <span>
              {language === 'en' ? 'INSPECT' : language === 'es' ? 'VERIFICAR' : 'VÉRIFIER'}
            </span>
          )}
        </button>
      </div>

      {aiReport && (
        <div className="p-5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider">
            <span className="inline-flex items-center gap-2">
              <Bot className="w-4 h-4" aria-hidden="true" />
              Rapport d’Analyse IA Gemini (SOC)
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {humanizeAiText(aiReport)}
          </div>
        </div>
      )}

      {result && <RiskDisplay result={result} />}
    </div>
  );
};

const EmailAnalyzer = () => {
  const { language } = useI18n();
  const [emailBody, setEmailBody] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const analyzeEmail = async () => {
    if (!emailBody.trim()) return;
    setIsAnalyzing(true);
    setAiReport(null);
    const findings = [];
    let risk = 0;
    const body = (emailBody || '').toLowerCase();

    if (
      body.includes('urgent') ||
      body.includes('immédiat') ||
      body.includes('immediately') ||
      body.includes('inmediato')
    ) {
      findings.push(
        language === 'en'
          ? 'Artificial psychological urgency pressure'
          : language === 'es'
            ? 'Presión artificial de urgencia'
            : "Sentiment d'urgence psychologique",
      );
      risk += 30;
    }
    if (
      body.includes('bloqué') ||
      body.includes('suspend') ||
      body.includes('suspensión') ||
      body.includes('verrouillé')
    ) {
      findings.push(
        language === 'en'
          ? 'Account suspension threat lure'
          : language === 'es'
            ? 'Amenaza de bloqueo de cuenta'
            : "Menace d'interruption ou suspension de compte",
      );
      risk += 40;
    }
    if (
      body.includes('gagnant') ||
      body.includes('héritage') ||
      body.includes('winner') ||
      body.includes('lottery') ||
      body.includes('premio')
    ) {
      findings.push(
        language === 'en'
          ? 'Financial lure or unrealistic prize promise'
          : language === 'es'
            ? 'Cebo de premio económico'
            : 'Appât de gain financier irréaliste',
      );
      risk += 30;
    }

    try {
      const aiResult = await analyzeSecurityLog(
        `Analyse cet email/message suspect pour détecter du phishing, du smishing, ou des techniques d'ingénierie sociale : ${emailBody}`,
      );
      setAiReport(aiResult);
      if (
        aiResult &&
        (aiResult.toLowerCase().includes('critique') ||
          aiResult.toLowerCase().includes('élevé') ||
          aiResult.toLowerCase().includes('phishing') ||
          aiResult.toLowerCase().includes('suspect') ||
          aiResult.toLowerCase().includes('arnaque'))
      ) {
        risk = Math.max(risk, 88);
      }
    } catch {
      // fallback
    }

    setResult({ risk: Math.min(risk, 100), findings });
    setIsAnalyzing(false);

    const notifyMsg =
      risk > 50
        ? language === 'en'
          ? 'Likely Phishing attempt detected!'
          : language === 'es'
            ? '¡Intento de Phishing probable!'
            : 'Tentative de Phishing probable !'
        : language === 'en'
          ? 'Email content inspected.'
          : language === 'es'
            ? 'Correo inspeccionado.'
            : "Analyse d'email terminée.";

    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: {
          message: notifyMsg,
          type: risk > 50 ? 'warning' : 'info',
        },
      }),
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl border-t-4 border-t-emerald-500 space-y-6">
      <div>
        <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 dark:text-white uppercase tracking-tight">
          {language === 'en'
            ? 'Phishing & Smishing AI Scanner'
            : language === 'es'
              ? 'Escáner de Phishing con IA'
              : 'Analyseur Phishing & SMS par IA'}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {language === 'en'
            ? 'Analyze suspicious emails, messages, or invoice notices using heuristic rules and Gemini AI.'
            : language === 'es'
              ? 'Analiza correos o mensajes sospechosos con reglas heurísticas y Gemini IA.'
              : 'Analysez les emails et messages suspects par règles heuristiques et intelligence artificielle Gemini.'}
        </p>
      </div>
      <textarea
        className="w-full h-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 outline-none text-slate-800 dark:text-slate-300 text-xs md:text-sm font-mono"
        placeholder={
          language === 'en'
            ? 'Paste suspicious email text here...'
            : language === 'es'
              ? 'Pega el texto del correo aquí...'
              : 'Collez le contenu du message suspect ici...'
        }
        value={emailBody}
        onChange={(e) => setEmailBody(e.target.value)}
      />
      <button
        onClick={analyzeEmail}
        disabled={isAnalyzing}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm shadow-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>
              {language === 'en'
                ? 'SCANNING...'
                : language === 'es'
                  ? 'ESCANEANDO...'
                  : 'ANALYSE...'}
            </span>
          </>
        ) : (
          <span>
            {language === 'en'
              ? 'SCAN EMAIL'
              : language === 'es'
                ? 'ESCANEAR MENSAJE'
                : 'DÉTECTER LES RUSES'}
          </span>
        )}
      </button>

      {aiReport && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            <span className="inline-flex items-center gap-2">
              <Bot className="w-4 h-4" aria-hidden="true" />
              Rapport d’Analyse IA Gemini (SOC)
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {humanizeAiText(aiReport)}
          </div>
        </div>
      )}

      {result && <RiskDisplay result={result} />}
    </div>
  );
};

const PasswordTester = () => {
  const { language } = useI18n();
  const [password, setPassword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const checkStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const score = checkStrength(password);
  const labelsFr = ['Nul', 'Risqué', 'Faible', 'Moyen', 'Fort', 'Top'];
  const labelsEn = ['None', 'Risky', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const labelsEs = ['Nulo', 'Arriesgado', 'Débil', 'Medio', 'Fuerte', 'Excelente'];
  const labels = language === 'en' ? labelsEn : language === 'es' ? labelsEs : labelsFr;
  const colors = [
    'bg-slate-400',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-cyan-400',
  ];

  const auditWithAI = async () => {
    if (!password.trim()) return;
    setIsAnalyzing(true);
    setAiFeedback(null);
    try {
      const res = await analyzeSecurityLog(
        `Analyse la robustesse cryptographique et la résistance aux attaques par dictionnaire de ce mot de passe (fournis des conseils d'amélioration sans répéter le mot de passe en clair) : ${password}`,
      );
      setAiFeedback(res);
    } catch {
      setAiFeedback('Analyse IA indisponible.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl border-t-4 border-t-yellow-500 space-y-6">
      <div>
        <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 dark:text-white uppercase tracking-tight">
          {language === 'en'
            ? 'Password Strength & AI Entropy Analyzer'
            : language === 'es'
              ? 'Analizador de Fuerza de Contraseña con IA'
              : 'Testeur d’Entropie & Force de Mot de Passe par IA'}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {language === 'en'
            ? 'Evaluate length, character variety, and dictionary brute-force resistance using AI.'
            : language === 'es'
              ? 'Evalúa longitud y resistencia contra fuerza bruta usando IA.'
              : 'Évaluez la longueur, la diversité de caractères et la résistance aux attaques par dictionnaire via l’IA Gemini.'}
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            language === 'en'
              ? 'Type password to test...'
              : language === 'es'
                ? 'Escribe contraseña para probar...'
                : 'Saisissez un mot de passe à tester...'
          }
          className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-lg md:text-xl font-mono text-slate-800 dark:text-white"
        />
        <button
          onClick={auditWithAI}
          disabled={isAnalyzing || !password.trim()}
          className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-slate-950 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>
                {language === 'en'
                  ? 'AUDITING...'
                  : language === 'es'
                    ? 'AUDITANDO...'
                    : 'AUDIT...'}
              </span>
            </>
          ) : (
            <span>
              {language === 'en' ? 'AI AUDIT' : language === 'es' ? 'AUDITORÍA IA' : 'AUDIT PAR IA'}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] md:text-xs font-black uppercase text-slate-500">
          <span>{labels[score]}</span>
          <span>{score * 20}%</span>
        </div>
        <div className="h-3 md:h-4 bg-slate-100 dark:bg-slate-800 rounded-full flex gap-1 overflow-hidden p-0.5 md:p-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-700 ${i < score ? colors[score] : 'bg-transparent'}`}
            ></div>
          ))}
        </div>
      </div>

      {aiFeedback && (
        <div className="p-5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-yellow-800 dark:text-yellow-300 uppercase tracking-wider">
            <span className="inline-flex items-center gap-2">
              <Bot className="w-4 h-4" aria-hidden="true" />
              Audit de Sécurité IA (Entropie & Résistance)
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {humanizeAiText(aiFeedback)}
          </div>
        </div>
      )}
    </div>
  );
};

const AuditLogViewer = () => {
  const { language } = useI18n();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  useEffect(() => {
    setLogs(getAuditLogs());
  }, []);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl border-t-4 border-t-slate-500">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
          {language === 'en'
            ? 'Security Audit Logs'
            : language === 'es'
              ? 'Registros de Auditoría'
              : 'Logs d’Audit de Sécurité'}
        </h3>
        <button
          onClick={() => {
            const confirmMsg =
              language === 'en'
                ? 'Clear all logs?'
                : language === 'es'
                  ? '¿Vaciar todos los registros?'
                  : 'Vider tous les logs ?';
            if (confirm(confirmMsg)) {
              clearAuditLogs();
              setLogs([]);
            }
          }}
          className="text-[10px] text-red-500 font-bold hover:bg-red-500/10 px-3 py-1 rounded-lg"
        >
          {language === 'en' ? 'CLEAR' : language === 'es' ? 'VACIAR' : 'VIDER'}
        </button>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            {language === 'en'
              ? 'No logs recorded yet.'
              : language === 'es'
                ? 'No hay registros todavía.'
                : 'Aucun log enregistré pour le moment.'}
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 p-3 dark:bg-slate-950 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              <div
                className={`w-1 h-6 rounded-full ${log.level === 'alert' ? 'bg-red-500' : 'bg-cyan-500'}`}
              ></div>
              <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black uppercase text-slate-500">
                  {log.category}
                </span>
                <p className="text-[11px] md:text-xs font-bold dark:text-slate-200 text-slate-800 truncate">
                  {log.event}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SecurityTools;
