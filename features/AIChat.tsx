import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Paperclip,
  Camera,
  Sparkles,
  Trash2,
  Download,
  ArrowLeft,
  KeyRound,
  Smartphone,
  Wifi,
  Globe,
  X,
  FileText,
  LifeBuoy,
  FileCode,
  Flag,
  Terminal,
  Bot,
  Code,
} from 'lucide-react';
import { chatWithCyberExpertStream, summarizeConversation } from '../services/geminiService';
import { getStats, getPreferences } from '../services/persistenceService';
import { UserPreferences } from '../types';
import { useI18n } from '../services/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  parts: { text: string; inlineData?: { data: string; mimeType: string } }[];
}

interface AIChatProps {
  onBack: () => void;
  initialPrompt?: string;
}

const TOPICS = [
  { id: 'all', label: 'Tout explorer', icon: Sparkles },
  { id: 'code', label: '💻 Codes & Scripts Pratiques', icon: FileCode },
  { id: 'ai_threats', label: '🧠 Menaces & Sécurité IA', icon: Bot },
  { id: 'ctf_help', label: '🚩 Défis & Indices CTF', icon: Flag },
  { id: 'phishing', label: 'Phishing & Arnaques', icon: ShieldAlert },
  { id: 'passwords', label: 'Mots de passe & 2FA', icon: KeyRound },
  { id: 'mobile', label: 'Smartphones & Appels', icon: Smartphone },
  { id: 'network', label: 'Wi-Fi & Navigation', icon: Wifi },
  { id: 'privacy', label: 'Données & RGPD', icon: Globe },
];

const SUGGESTED_QUESTIONS: { [key: string]: string[] } = {
  all: [
    "Donne-moi un script Python pour calculer l'entropie et la force d'un mot de passe",
    'Comment me protéger contre une attaque par Prompt Injection dans un LLM ?',
    'Comment reconnaître un email de phishing sans me faire avoir ?',
    'Donne-moi un code de middleware Express pour sécuriser les headers HTTP',
    "J'ai reçu un SMS suspect pour un colis en attente, que faire ?",
    "Comment fonctionne l'arnaque par Deepfake Vocal (CEO Fraud) et comment la déjouer ?",
  ],
  code: [
    "Donne-moi un script Python pour calculer l'entropie et la force d'un mot de passe",
    'Écris un script Python pour détecter les faux liens et domaines suspects dans un email',
    'Génère un middleware Express Node.js avec Helmet, CORS stricts et rate-limiting',
    'Donne un script Bash pour auditer les ports ouverts, les connexions actives et les services',
    'Comment écrire un guardrail en Python contre le Prompt Injection pour un chatbot ?',
    'Donne un exemple de requête SQL préparée pour empêcher les injections SQL (Python / Node / PHP)',
  ],
  ai_threats: [
    "Qu'est-ce qu'une injection de prompt (Prompt Injection) directe et indirecte ?",
    'Comment les cybercriminels utilisent-ils les deepfakes vocaux pour la fraude au président ?',
    'Comment détecter si une image ou vidéo reçue a été générée par une IA ?',
    "Qu'est-ce que l'empoisonnement de données (Data Poisoning) dans les modèles IA ?",
    'Comment se protéger contre les hallucinations de packages malveillants (Package Hallucination) ?',
    "Qu'est-ce que le détournement d'outils d'agent autonome (Agent Tool Hijacking) ?",
  ],
  ctf_help: [
    "Comment aborder un défi CTF d'injection SQL ou de contournement d'authentification ?",
    'Quelles sont les méthodes pour décoder une chaîne en Base64, Hexadécimal ou ROT13 ?',
    "Comment trouver un drapeau (Flag) caché dans les en-têtes HTTP avec l'inspecteur web ?",
    'Quels sont les principes pour réussir un défi CTF de jailbreak ou prompt injection ?',
  ],
  phishing: [
    'Quels sont les 5 signes qui trahissent un email de phishing ?',
    "Comment vérifier si l'adresse email de l'expéditeur est réelle ?",
    "J'ai cliqué sur un lien suspect dans un SMS, quelles sont les étapes immédiates ?",
    "C'est quoi le 'Spear-phishing' et l'arnaque au faux président ?",
  ],
  passwords: [
    'Quelle est la méthode infaillible pour créer un mot de passe mémorable et incassable ?',
    'Pourquoi utiliser un gestionnaire de mots de passe plutôt que le carnet ou le navigateur ?',
    "Quelle est la différence entre un code SMS et une application d'authentification (Google Auth, Bitwarden) ?",
    'Les clés de sécurité physiques (Passkeys / YubiKey) valent-elles le coup ?',
  ],
  mobile: [
    "Quelles autorisations d'applications sont dangereuses sur Android ou iPhone ?",
    'Comment détecter si mon téléphone est espionné ou infecté par un malware ?',
    'Arnaque au faux conseiller bancaire par téléphone : comment réagir immédiatement ?',
    'Est-il sûr de scanner les QR codes dans les lieux publics ?',
  ],
  network: [
    "Est-ce que naviguer en 'Mode Privé' empêche le piratage ou la surveillance ?",
    'Un VPN gratuit est-il risqué pour mes données personnelles ?',
    'Comment configurer la sécurité de ma box Internet à la maison ?',
    "Que signifie le cadenas 'HTTPS' dans la barre d'adresse ?",
  ],
  privacy: [
    'Comment nettoyer mon empreinte numérique et supprimer mes vieux comptes ?',
    "Qu'est-ce que le RGPD et comment demander la suppression de mes données ?",
    "Pourquoi ne faut-il jamais poster des photos de billets d'avion ou de badges pros ?",
    'Comment sécuriser mon compte WhatsApp contre les piratages de code ?',
  ],
};

const EMERGENCY_ACTIONS = [
  {
    title: "J'ai cliqué sur un lien suspect",
    desc: 'Déconnexion immédiate, analyse antivirus et surveillance',
    prompt:
      "URGENCE : J'ai cliqué sur un lien suspect dans un email ou SMS. Donne-moi la checklist d'urgence immédiate étape par étape pour sécuriser mon appareil !",
  },
  {
    title: "J'ai donné mon mot de passe",
    desc: 'Modification rapide, révocation des sessions et 2FA',
    prompt:
      "URGENCE : J'ai saisi mes identifiants et mot de passe sur un faux site. Comment réagir dans les 5 prochaines minutes pour éviter qu'on me vole mon compte ?",
  },
  {
    title: 'Mon compte est piraté',
    desc: 'Procédure de récupération et alerte des contacts',
    prompt:
      "URGENCE : Mon compte (email / réseau social) a été piraté et je n'y ai plus accès. Quelles sont les démarches exactes pour le récupérer et limiter les dégâts ?",
  },
  {
    title: 'Message de rançon ou blocage',
    desc: 'Ransomware : ne pas payer, isoler le réseau',
    prompt:
      'URGENCE : Mon écran affiche un message de blocage ou demande de rançon (ransomware). Que dois-je faire immédiatement ? Dois-je payer ?',
  },
];

// Dedicated component to render practical code snippets with copy button & syntax styling
const CodeSnippetBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 font-mono text-xs shadow-2xl">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            <span>{language || 'code pratique'}</span>
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copied ? 'Copié !' : 'Copier le code'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-cyan-300 leading-relaxed scrollbar-thin whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Helper to format response text nicely with badges and code blocks
const FormattedAssistantMessage: React.FC<{ text?: string }> = ({ text }) => {
  const safeText = typeof text === 'string' ? text : '';
  // Parse text for markdown code blocks ```lang ... ```
  const parts = safeText.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm md:text-base font-normal">
      {parts.map((part, partIdx) => {
        // If this part is a code block
        if (part && part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3);
          const firstLineBreak = content.indexOf('\n');
          let language = 'code';
          let codeBody = content;

          if (firstLineBreak !== -1) {
            language = content.slice(0, firstLineBreak).trim() || 'code';
            codeBody = content.slice(firstLineBreak + 1);
          }

          return <CodeSnippetBlock key={`code-${partIdx}`} code={codeBody} language={language} />;
        }

        // Standard text lines
        const lines = (part || '').split('\n');
        return (
          <React.Fragment key={`text-${partIdx}`}>
            {lines.map((line, idx) => {
              const trimmed = (line || '').trim();
              if (!trimmed) {
                return <div key={idx} className="h-1" />;
              }

              // High Threat Badge
              if (
                trimmed?.includes('NIVEAU DE DANGER : ÉLEVÉ') ||
                trimmed?.includes('[RISQUE ÉLEVÉ]')
              ) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-xs md:text-sm tracking-wide my-2"
                  >
                    <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
                    <span>{trimmed.replace(/\[|\]/g, '')}</span>
                  </div>
                );
              }

              // Moderate Threat Badge
              if (
                trimmed?.includes('NIVEAU DE DANGER : MODÉRÉ') ||
                trimmed?.includes('[RISQUE MODÉRÉ]')
              ) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs md:text-sm tracking-wide my-2"
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                    <span>{trimmed.replace(/\[|\]/g, '')}</span>
                  </div>
                );
              }

              // Low Threat / Safe Badge
              if (
                trimmed?.includes('NIVEAU DE DANGER : FAIBLE') ||
                trimmed?.includes('[RISQUE FAIBLE]')
              ) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs md:text-sm tracking-wide my-2"
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>{trimmed.replace(/\[|\]/g, '')}</span>
                  </div>
                );
              }

              // Section Titles (### or **Title**)
              if (
                trimmed.startsWith('### ') ||
                trimmed.startsWith('## ') ||
                trimmed.startsWith('# ')
              ) {
                const title = trimmed.replace(/^#+\s*/, '');
                return (
                  <h4
                    key={idx}
                    className="text-base md:text-lg font-bold text-cyan-400 dark:text-cyan-300 pt-2 pb-1 border-b border-cyan-500/20"
                  >
                    {title}
                  </h4>
                );
              }

              // Numbered list item
              const numberedMatch = trimmed.match(/^(\d+[.)])\s*(.*)/);
              if (numberedMatch) {
                return (
                  <div key={idx} className="flex gap-3 items-start pl-1 my-1">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {numberedMatch[1].replace(/[.)]/, '')}
                    </span>
                    <span className="flex-1 text-slate-200 dark:text-slate-100 font-medium">
                      {numberedMatch[2]}
                    </span>
                  </div>
                );
              }

              // Bullet point
              if (
                trimmed.startsWith('- ') ||
                trimmed.startsWith('• ') ||
                trimmed.startsWith('* ')
              ) {
                return (
                  <div key={idx} className="flex gap-2.5 items-start pl-2 my-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-2" />
                    <span className="flex-1 text-slate-200 dark:text-slate-200">
                      {trimmed.replace(/^[-•*]\s*/, '')}
                    </span>
                  </div>
                );
              }

              return (
                <p key={idx} className="text-slate-300 dark:text-slate-200">
                  {line}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const MessageItem = memo(function MessageItem({
  message,
  isAssistant,
  avatar,
  onSpeak,
  isSpeaking,
  onCopy,
}: {
  message: Message;
  isAssistant: boolean;
  avatar?: string;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  onCopy: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.parts[0].text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 md:gap-4 ${isAssistant ? 'flex-row' : 'flex-row-reverse'} items-start w-full mb-6 group`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${
          isAssistant
            ? 'bg-slate-900 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
            : 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-600/20'
        }`}
      >
        {isAssistant ? (
          <Shield className="w-5 h-5 text-cyan-400" />
        ) : avatar ? (
          <img src={avatar} alt="User" className="w-full h-full object-cover rounded-2xl" />
        ) : (
          <span className="font-bold text-sm">VOUS</span>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} max-w-[88%] md:max-w-[80%]`}
      >
        <div className="flex items-center gap-2 mb-1.5 px-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            {isAssistant ? 'CyberGuard IA' : 'Vous'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{message.timestamp}</span>
        </div>

        <div
          className={`relative px-5 py-4 md:px-6 md:py-5 rounded-2xl border shadow-xl transition-all ${
            isAssistant
              ? 'bg-slate-900/90 dark:bg-slate-900/90 text-slate-100 rounded-tl-sm border-slate-800 dark:border-slate-800/80 backdrop-blur-md'
              : 'bg-cyan-700/80 dark:bg-cyan-600/80 text-white rounded-tr-sm border-cyan-500/30 backdrop-blur-md'
          }`}
        >
          {message.parts[0].inlineData && (
            <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/50 max-w-sm">
              <img
                src={`data:${message.parts[0].inlineData.mimeType};base64,${message.parts[0].inlineData.data}`}
                alt="Capture analysée"
                className="w-full h-auto object-cover max-h-60"
              />
              <div className="p-2 bg-slate-950/70 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                <span>Image / Capture d'écran jointe pour audit</span>
              </div>
            </div>
          )}

          {isAssistant ? (
            <FormattedAssistantMessage text={message?.parts?.[0]?.text || ''} />
          ) : (
            <p className="whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed">
              {message?.parts?.[0]?.text || ''}
            </p>
          )}

          {/* Assistant Action Bar */}
          {isAssistant && (
            <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-slate-800/80">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                title="Copier la réponse"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>

              <button
                onClick={() => onSpeak(message.parts[0].text)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isSpeaking
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Écouter la réponse"
              >
                {isSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{isSpeaking ? 'Arrêter' : 'Écouter'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const AIChat: React.FC<AIChatProps> = ({ onBack, initialPrompt }) => {
  const { t, language } = useI18n();
  const [prefs] = useState<UserPreferences>(getPreferences());
  const stats = getStats();

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSentRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom(streamingMessage ? 'auto' : 'smooth');
  }, [messages, streamingMessage, scrollToBottom]);

  // STT : Reconnaissance vocale
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        setIsListening(true);
        recognitionRef.current?.start();
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  // TTS : Synthèse vocale
  const speakText = (text: string, msgId: string) => {
    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text for speech
    const clean = text.replace(/[#*`_[\]]/g, ' ').replace(/https?:\/\/\S+/g, 'link');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSend = async (overrideMsg?: string) => {
    const finalMsg = overrideMsg || input.trim();
    if ((!finalMsg && !capturedImage) || isLoading) return;

    const currentImage = capturedImage;
    setInput('');
    setCapturedImage(null);
    setIsLoading(true);

    const localeCode = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
    const timeStr = new Date().toLocaleTimeString(localeCode, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const userMsgId = `user-${Date.now()}`;

    const defaultActionText =
      language === 'en'
        ? 'Analyzing this screenshot / suspicious file.'
        : language === 'es'
          ? 'Análisis de esta captura de pantalla o archivo sospechoso.'
          : "Analyse de cette capture d'écran / fichier suspect.";

    const newUserPart: any = { text: finalMsg || defaultActionText };
    if (currentImage) {
      newUserPart.inlineData = {
        data: currentImage.split(',')[1],
        mimeType: currentImage.split(';')[0].split(':')[1] || 'image/jpeg',
      };
    }

    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      timestamp: timeStr,
      parts: [newUserPart],
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setStreamingMessage('');

    try {
      const history = [...messages, newUserMessage].map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.parts.map((p) => ({ text: p.text })),
      }));

      const imagePayload = currentImage
        ? {
            data: currentImage.split(',')[1],
            mimeType: currentImage.split(';')[0].split(':')[1] || 'image/jpeg',
          }
        : undefined;

      const userCtx = `Utilisateur : ${prefs.userName || 'Apprenant'}, Niveau moyen aux quiz cyber : ${stats.avgScore || 50}%, lang:${language}`;

      let fullReply = '';
      await chatWithCyberExpertStream(
        newUserPart.text,
        history,
        (chunk) => {
          fullReply += chunk;
          setStreamingMessage(fullReply);
        },
        imagePayload,
        userCtx,
      );

      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString(localeCode, {
            hour: '2-digit',
            minute: '2-digit',
          }),
          parts: [{ text: fullReply }],
        },
      ]);
      setStreamingMessage(null);
    } catch (error) {
      // Le modèle IA est temporairement surchargé côté fournisseur (503/UNAVAILABLE) :
      // message distinct d'une panne réseau, pour ne pas orienter l'utilisateur vers son wifi à tort.
      const overloaded =
        error instanceof Error && /503|UNAVAILABLE|overloaded|high demand/i.test(error.message);
      const errMsg = overloaded
        ? language === 'en'
          ? "The AI assistant is temporarily overloaded on the provider's side. Please try again in a moment."
          : language === 'es'
            ? 'El asistente IA está temporalmente saturado del lado del proveedor. Inténtalo de nuevo en un momento.'
            : "L'assistant IA est momentanément surchargé côté fournisseur (forte demande). Réessayez dans quelques instants."
        : language === 'en'
          ? 'Sorry, the security intelligence connection was interrupted. Please retry.'
          : language === 'es'
            ? 'Lo sentimos, se interrumpió la conexión con la inteligencia de seguridad. Por favor, inténtalo de nuevo.'
            : "Désolé, la connexion à l'intelligence de sécurité a été interrompue. Veuillez réessayer ou vérifier votre réseau.";

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString(localeCode, {
            hour: '2-digit',
            minute: '2-digit',
          }),
          parts: [{ text: errMsg }],
        },
      ]);
      setStreamingMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger initial prompt if provided (e.g. from CTF challenge or Home quick action)
  useEffect(() => {
    if (initialPrompt && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (limite 8 Mo).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (err) {
      alert('Accès caméra requis pour analyser un document ou un écran.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvasRef.current.toDataURL('image/jpeg', 0.85));
        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
        setIsCameraOpen(false);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Voulez-vous réinitialiser l'échange avec CyberGuard IA ?")) {
      setMessages([]);
      setStreamingMessage(null);
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  };

  const handleDownloadReport = async () => {
    if (messages.length === 0) {
      alert('Aucun message à synthétiser pour le moment.');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.parts[0].text }],
      }));
      const summary = await summarizeConversation(historyPayload);

      const content = `AUDIT DE CYBERSÉCURITÉ & SENSIBILISATION
Généré par CyberGuard IA - ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
------------------------------------------------------------
${summary}

============================================================
HISTORIQUE COMPLET DES ÉCHANGES :
${messages.map((m) => `[${m.timestamp}] ${m.role === 'assistant' ? 'CYBERGUARD' : 'UTILISATEUR'}:\n${m.parts[0].text}\n`).join('\n---\n')}
`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-cyber-sensibilisation-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Impossible de générer le rapport pour le moment.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const currentQuestions = SUGGESTED_QUESTIONS[selectedTopic] || SUGGESTED_QUESTIONS.all;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[84vh] w-full max-w-5xl mx-auto rounded-2xl md:rounded-3xl border border-slate-800/80 bg-slate-950 shadow-2xl overflow-hidden animate-in fade-in duration-300">
      {/* Top Bar / Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Retour à l'accueil"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                  CyberGuard IA
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sensibilisation active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Conseiller de sécurité numérique & analyse de menaces
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Emergency SOS Button */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all active:scale-95 animate-pulse"
            title="Assistance d'urgence en cas de doute ou piratage"
          >
            <LifeBuoy className="w-4 h-4" />
            <span className="hidden sm:inline">SOS Incident</span>
          </button>

          {messages.length > 0 && (
            <>
              <button
                onClick={handleDownloadReport}
                disabled={isGeneratingSummary}
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors text-xs flex items-center gap-1"
                title="Télécharger le compte-rendu d'audit"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Rapport</span>
              </button>

              <button
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                title="Effacer la conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && !streamingMessage && (
          <div className="max-w-2xl mx-auto my-4 space-y-6 animate-in fade-in duration-500">
            {/* Welcoming Card */}
            <div className="text-center space-y-3 pt-2">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-xl shadow-cyan-500/10">
                <Shield className="w-10 h-10" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Posez vos questions de cybersécurité
              </h2>
              <p className="text-sm md:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
                Apprenez à déjouer les pièges en ligne, protégez vos comptes, auditez un message
                suspect ou préparez vos réflexes face aux cyberattaques.
              </p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {TOPICS.map((topic) => {
                const Icon = topic.icon;
                const active = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{topic.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Suggested Prompts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
              {currentQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="p-3.5 text-left rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all text-xs md:text-sm font-medium flex items-start gap-2.5 group shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="leading-snug">{q}</span>
                </button>
              ))}
            </div>

            {/* Quick Tips Box */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300">Astuce pratique :</span> Vous pouvez
                joindre une capture d'écran d'un faux email, SMS ou message d'alerte en cliquant sur
                l'icône trombone ci-dessous pour une analyse immédiate de légitimité.
              </div>
            </div>
          </div>
        )}

        {/* Render History Messages */}
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            isAssistant={m.role === 'assistant'}
            avatar={prefs.userAvatar}
            onSpeak={(text) => speakText(text, m.id)}
            isSpeaking={speakingMessageId === m.id}
            onCopy={handleCopyText}
          />
        ))}

        {/* Live Streaming Message Bubble */}
        {streamingMessage !== null && (
          <div className="flex gap-3 md:gap-4 flex-row items-start w-full mb-6">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center bg-slate-900 border border-cyan-500/30 text-cyan-400 shrink-0 shadow-lg">
              <Shield className="w-5 h-5 animate-pulse text-cyan-400" />
            </div>
            <div className="flex flex-col items-start max-w-[88%] md:max-w-[80%]">
              <div className="flex items-center gap-2 mb-1.5 px-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400 animate-pulse">
                  CyberGuard IA analyse...
                </span>
              </div>
              <div className="px-5 py-4 md:px-6 md:py-5 rounded-2xl rounded-tl-sm bg-slate-900/90 text-slate-100 border border-cyan-500/30 shadow-xl backdrop-blur-md">
                <FormattedAssistantMessage text={streamingMessage} />
                <span className="inline-block w-2 h-4 bg-cyan-400 ml-1.5 animate-pulse rounded-full align-middle" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Bar & Attachment Preview */}
      <div className="p-3 md:p-4 bg-slate-900/95 border-t border-slate-800 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Image attachment pill */}
          {capturedImage && (
            <div className="flex items-center gap-3 p-2 bg-slate-800/90 rounded-xl border border-cyan-500/30 w-fit animate-in fade-in">
              <img
                src={capturedImage}
                alt="Pièce jointe"
                className="w-12 h-12 object-cover rounded-lg border border-slate-700"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Capture prête</p>
                <p className="text-[10px] text-slate-400">Sera transmise pour analyse</p>
              </div>
              <button
                onClick={() => setCapturedImage(null)}
                className="w-6 h-6 rounded-lg bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Code & Security Prompts Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>Scripts :</span>
            </span>
            <button
              type="button"
              onClick={() =>
                handleSend(
                  "Donne-moi un script Python pour calculer l'entropie et la force d'un mot de passe",
                )
              }
              className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors shrink-0 flex items-center gap-1 font-mono text-[11px]"
            >
              <span>🐍 Python Passwords</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleSend(
                  'Comment concevoir un Guardrail en Python contre le Prompt Injection direct et indirect pour une IA ? Donne le code complet avec explications.',
                )
              }
              className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors shrink-0 flex items-center gap-1 font-mono text-[11px]"
            >
              <span>🛡️ Guardrail Anti-Prompt-Injection</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleSend(
                  'Génère un middleware Express Node.js avec Helmet, CORS stricts et rate-limiting anti-bruteforce',
                )
              }
              className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors shrink-0 flex items-center gap-1 font-mono text-[11px]"
            >
              <span>🔒 Headers Express Sécurisés</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleSend(
                  'Donne un script Bash pour auditer les ports ouverts, les connexions actives et les services sur un serveur Linux',
                )
              }
              className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors shrink-0 flex items-center gap-1 font-mono text-[11px]"
            >
              <span>💻 Audit Bash Serveur</span>
            </button>
          </div>

          {/* Prompt Form */}
          <div className="flex items-end gap-2 bg-slate-950 border border-slate-800 focus-within:border-cyan-500/50 rounded-2xl p-2 transition-all shadow-inner">
            {/* Attachment Button */}
            <div className="flex items-center gap-1 shrink-0 pb-1 pl-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors"
                title="Joindre une capture d'écran / image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={startCamera}
                className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors hidden sm:flex"
                title="Scanner avec la caméra"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Posez votre question de cybersécurité (ex: Comment sécuriser mon wifi ?)"
              rows={1}
              className="flex-1 bg-transparent px-2 py-2 text-sm md:text-base text-white outline-none resize-none max-h-32 placeholder:text-slate-500"
              disabled={isLoading}
            />

            {/* Mic Dictation */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all shrink-0 mb-0.5 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Dictée vocale"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && !capturedImage)}
              className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-white rounded-xl font-bold transition-all shrink-0 shadow-lg shadow-cyan-600/20 active:scale-95 mb-0.5"
              title="Envoyer la question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 pt-1">
            <span>CyberGuard IA est conçu pour la sensibilisation et les bonnes pratiques.</span>
            <span className="hidden sm:inline">
              Entrée pour envoyer, Maj+Entrée pour un saut de ligne
            </span>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex items-center gap-6 mt-6">
            <button
              onClick={() => {
                if (videoRef.current?.srcObject) {
                  (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
                }
                setIsCameraOpen(false);
              }}
              className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 transition-colors"
            >
              Annuler
            </button>

            <button
              onClick={capturePhoto}
              className="px-8 py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm shadow-xl shadow-cyan-600/30 hover:bg-cyan-500 transition-all active:scale-95 flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Prendre la photo
            </button>
          </div>
        </div>
      )}

      {/* Emergency SOS Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">SOS Incident Cybersécurité</h3>
                  <p className="text-xs text-slate-400">
                    Assistance rapide face à une situation anormale
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {EMERGENCY_ACTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setShowEmergencyModal(false);
                    handleSend(item.prompt);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-red-500/40 transition-all group"
                >
                  <p className="text-sm font-bold text-white group-hover:text-red-300 transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 text-slate-500 group-hover:text-red-400 transition-colors" />
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                <strong>Règle d'or :</strong> Ne communiquez jamais de code reçu par SMS, ne
                transférez aucun argent sous la pression, et isolez l'appareil en cas de doute.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
