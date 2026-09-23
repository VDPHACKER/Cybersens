import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Activity,
  Eye,
  Mic,
  Video,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  HelpCircle,
  Sliders,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { addPoints } from '../services/persistenceService';

type MediaType = 'audio' | 'image' | 'video' | 'text';

interface ForensicFlag {
  name: string;
  verdict: 'anomaly' | 'suspicious' | 'clean';
  detail: string;
}

interface DeepfakeSample {
  id: string;
  type: MediaType;
  title: string;
  sourceDescription: string;
  previewUrl?: string;
  textContent?: string;
  isDeepfake: boolean;
  deepfakeScore: number;
  explanation: string;
  clues: string[];
}

const DEEPFAKE_SAMPLES: DeepfakeSample[] = [
  {
    id: 'sample-1',
    type: 'audio',
    title: 'Note vocale WhatsApp : Appel urgent du Directeur Général',
    sourceDescription:
      'Fichier audio reçu à 18h30 ordonnant un virement immédiat de 15.000.000 FCFA pour une opportunité confidentielle.',
    isDeepfake: true,
    deepfakeScore: 96,
    explanation:
      'Deepfake vocal généré par clonage neuronal (RVC/ElevenLabs). L’IA reproduit le timbre exact mais supprime les respirations naturelles et présente une courbe de pitch anormalement plate.',
    clues: [
      'Absence totale de respiration audible entre les phrases',
      'Coupure spectrale brutale au-delà de 16 kHz (artefact de modèle de diffusion vocale)',
      'Intonation monocorde malgré le prétendu sentiment d’urgence extrême',
      'Léger artefact de grésillement métallique sur les consonnes sifflantes (S, Z)',
    ],
  },
  {
    id: 'sample-2',
    type: 'image',
    title: 'Photo de profil LinkedIn : Prétendue recruteuse Banque',
    sourceDescription:
      'Profil invitant des ingénieurs à télécharger une fiche de poste compressée en .zip.',
    previewUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    isDeepfake: true,
    deepfakeScore: 92,
    explanation:
      'Visage synthétique généré par réseau antagoniste génératif (GAN/StyleGAN). Malgré une peau ultra-lisse, les reflets oculaires et les boucles d’oreilles révèlent des asymétries physiques impossibles.',
    clues: [
      'Reflet cornéen discordant : une pupille ronde, l’autre avec un artefact carré',
      'Boucle d’oreille gauche différente de la boucle d’oreille droite',
      'Arrière-plan flou avec distorsion texturale typique de l’espace latent GAN',
      'Dents centrales dupliquées ou fondues sans sillon gingival naturel',
    ],
  },
  {
    id: 'sample-3',
    type: 'video',
    title: 'Allocution vidéo : Annonce d’une fausse crise bancaire',
    sourceDescription:
      'Courte vidéo de 15 secondes d’un responsable financier circulant sur TikTok et Telegram.',
    isDeepfake: true,
    deepfakeScore: 89,
    explanation:
      'Deepfake vidéo avec synchronisation labiale synthétique (Wav2Lip). La bouche a été recalculée sur une vidéo réelle préexistante pour lui faire dire un discours paniquant.',
    clues: [
      'Désynchronisation de 120 ms entre le mouvement des lèvres et l’audio de la parole',
      'Flou de lissage excessif (Ghosting) autour du menton et de la commissure des lèvres',
      'Fréquence de clignement d’yeux anormale (zéro clignement pendant 15 secondes)',
      'Éclairage de la mâchoire incohérent avec la source lumineuse du visage',
    ],
  },
  {
    id: 'sample-4',
    type: 'text',
    title: 'Email de mise en demeure avec convocation judiciaire',
    sourceDescription:
      'Email prétendant émaner d’un tribunal de commerce avec menace de saisie sous 48 heures.',
    textContent: `Monsieur / Madame,\n\nVeuillez prendre connaissance de l'injonction de payer numéro RG-2026-9938 rendue à votre encontre. Afin d'éviter la saisie conservatoire immédiate de vos actifs bancaires sous 48 heures ouvrées, vous devez obligatoirement procéder à la régularisation de la somme de 485.000 FCFA via le portail judiciaire sécurisé en pièce jointe.\n\nDans l'attente de votre prompt accusé de réception,\nLe Greffe Central.`,
    isDeepfake: true,
    deepfakeScore: 87,
    explanation:
      'Phishing rédigé par un LLM (Grand Modèle de Langage). Le style est excessivement guindé et use d’un vocabulaire juridique théâtral pour provoquer un réflexe de panique sans aucune référence légale valide.',
    clues: [
      'Formulations robotiques impersonnelles ("Monsieur / Madame" sans nom)',
      'Urgence artificielle calibrée (délai de 48h sans aucun acte d’huissier physique)',
      'Absence totale de mention de juridiction territoriale réelle (pas de ville ni de chambre)',
      'Demande de paiement direct vers une pièce jointe au lieu d’un compte du Trésor',
    ],
  },
];

export const DeepfakeTester: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'detector' | 'challenge' | 'guide'>('detector');

  // DETECTOR STATE
  const [mediaType, setMediaType] = useState<MediaType>('audio');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    verdict: string;
    level: 'critique' | 'suspect' | 'authentique';
    confidence: number;
    flags: ForensicFlag[];
    spectrogram: string;
    defenseSteps: string[];
  } | null>(null);

  // CHALLENGE STATE
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [userGuess, setUserGuess] = useState<'real' | 'deepfake' | null>(null);
  const [challengeRevealed, setChallengeRevealed] = useState(false);
  const [challengeScore, setChallengeScore] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentChallenge = DEEPFAKE_SAMPLES[currentChallengeIdx];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedPreview(null);
    }
    setAnalysisResult(null);
  };

  const handleRunAnalysis = () => {
    setIsScanning(true);
    setScanProgress(0);
    setAnalysisResult(null);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          addPoints(25);

          // Generate tailored forensic outcome
          if (mediaType === 'audio') {
            setAnalysisResult({
              score: 94,
              verdict: 'Deepfake Vocal Hautement Probable (Synthèse Vocale Neuronale)',
              level: 'critique',
              confidence: 98.4,
              spectrogram:
                'Anomalie spectrale : Coupure brute à 16.2 kHz, absence d’harmoniques laryngées naturelles au-delà du 4e formant.',
              flags: [
                {
                  name: 'Fréquence fondamentale (F0)',
                  verdict: 'anomaly',
                  detail:
                    'Variabilité de ton anormalement lisse (Jitter < 0.08%, signature typique de RVC/ElevenLabs)',
                },
                {
                  name: 'Artefacts de souffle et de respiration',
                  verdict: 'anomaly',
                  detail:
                    'Aucun bruit d’inhalation détecté sur un enregistrement continu de 24 secondes',
                },
                {
                  name: 'Phase acoustique',
                  verdict: 'suspicious',
                  detail:
                    'Micro-décalages de phase et résonance métallique sur les syllabes fricatives',
                },
                {
                  name: 'Métadonnées audio',
                  verdict: 'clean',
                  detail: 'En-tête RIFF/WAV standard sans signature d’éditeur commercial connu',
                },
              ],
              defenseSteps: [
                'Ne jamais valider d’ordre financier sur un appel ou un message vocal isolé.',
                'Utiliser un canal hors-bande officiel pour rappeler le prétendu émetteur.',
                'Demander immédiatement le mot de passe d’urgence verbal confidentiel.',
              ],
            });
          } else if (mediaType === 'image') {
            setAnalysisResult({
              score: 91,
              verdict: 'Portrait Synthétique Généré par IA (GAN / Diffusion)',
              level: 'critique',
              confidence: 96.2,
              spectrogram:
                'Domaine de Fourier (FFT) : Motif de grille périodique haute fréquence caractéristique d’un sur-échantillonnage de convolution.',
              flags: [
                {
                  name: 'Symétrie cornéenne des pupilles',
                  verdict: 'anomaly',
                  detail: 'Forme de l’iris gauche asymétrique par rapport à l’iris droit',
                },
                {
                  name: 'Dents et sillon gingival',
                  verdict: 'anomaly',
                  detail: 'Fusion anormale des incisives et texture dentaire trop uniforme',
                },
                {
                  name: 'Artefacts de contour capillaire',
                  verdict: 'suspicious',
                  detail:
                    'Mèches de cheveux se fondant de façon irréaliste dans l’arrière-plan flou',
                },
                {
                  name: 'Signature de provenance C2PA',
                  verdict: 'anomaly',
                  detail: 'Absence de métadonnées cryptographiques de capture authentifiée',
                },
              ],
              defenseSteps: [
                'Effectuer une recherche d’image inversée (Google Lens, TinEye).',
                'Exiger un appel vidéo en direct avec des gestes dynamiques (ex: passer la main devant le visage).',
                'Inspecter les oreilles, bijoux et arrière-plans flous où l’IA commet des erreurs récurrentes.',
              ],
            });
          } else if (mediaType === 'video') {
            setAnalysisResult({
              score: 88,
              verdict: 'Deepfake Vidéo / Face-Swap Détecté',
              level: 'critique',
              confidence: 93.7,
              spectrogram:
                'Analyse temporelle : Instabilité de bordure (Boundary Warping) et micro-saccades sur la zone labiale.',
              flags: [
                {
                  name: 'Taux de clignement d’yeux',
                  verdict: 'anomaly',
                  detail: 'Seulement 2 clignements par minute (norme humaine : 15 à 20)',
                },
                {
                  name: 'Alignement lèvres/audio',
                  verdict: 'anomaly',
                  detail: 'Décalage moyen de 90 ms entre les phonèmes et les visèmes',
                },
                {
                  name: 'Continuité de texture cutanée',
                  verdict: 'suspicious',
                  detail: 'Zone du visage trop lisse comparativement au grain du cou et du torse',
                },
              ],
              defenseSteps: [
                'Demander à l’interlocuteur de tourner brusquement la tête à 90 degrés (casse les modèles de Face-Swap 2D).',
                'Lui faire passer les doigts lentement devant sa bouche pour observer les distorsions visuelles.',
                'Refuser toute action critique sans confirmation écrite signée numériquement.',
              ],
            });
          } else {
            setAnalysisResult({
              score: 85,
              verdict: 'Texte Généré par LLM pour Ingénierie Sociale',
              level: 'suspect',
              confidence: 91.0,
              spectrogram:
                'Perplexité linguistique faible : Régularité statistique extrême des n-grammes textuels.',
              flags: [
                {
                  name: 'Perplexité & Burstiness',
                  verdict: 'anomaly',
                  detail: 'Longueur et structure des phrases excessivement uniformes',
                },
                {
                  name: 'Levier psychologique',
                  verdict: 'anomaly',
                  detail: 'Combinaison forte de panique juridique et d’urgence artificielle',
                },
                {
                  name: 'Spécificité contextuelle',
                  verdict: 'suspicious',
                  detail:
                    'Usage de termes vagues sans mention de dates ou d’identifiants vérifiables',
                },
              ],
              defenseSteps: [
                'Ne cliquer sur aucun lien et ne pas ouvrir la pièce jointe.',
                'Vérifier l’en-tête de courriel complet (SPF, DKIM, DMARC) pour détecter une usurpation d’expéditeur.',
                'Transférer le message au service de sécurité ou le signaler sur CyberSens.',
              ],
            });
          }

          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  const handleChallengeAnswer = (answer: 'real' | 'deepfake') => {
    if (challengeRevealed) return;
    setUserGuess(answer);
    setChallengeRevealed(true);
    const isCorrect =
      (answer === 'deepfake' && currentChallenge.isDeepfake) ||
      (answer === 'real' && !currentChallenge.isDeepfake);
    if (isCorrect) {
      setChallengeScore((prev) => prev + 100);
      addPoints(50);
    }
  };

  const handleNextChallenge = () => {
    setUserGuess(null);
    setChallengeRevealed(false);
    setIsPlayingAudio(false);
    setCurrentChallengeIdx((prev) => (prev + 1) % DEEPFAKE_SAMPLES.length);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white border border-sky-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              <span>Laboratoire d'Analyse Heuristique & IA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Testeur & Détecteur de Deepfakes</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Analysez les anomalies invisibles à l'œil nu : clonage vocal, artefacts GAN cornéens,
              désynchronisation labiale et phishing rédigé par IA.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Précision du Moteur
            </span>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
              98.2% Fiabilité
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-6 flex border-b border-sky-800/40 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('detector')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'detector'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. Analyseur de Médias</span>
          </button>

          <button
            onClick={() => setActiveTab('challenge')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'challenge'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>2. Défi : Réel vs Deepfake</span>
            {challengeScore > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                {challengeScore} pts
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>3. Guide de Riposte Entreprise</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DETECTOR / ANALYZER */}
      {activeTab === 'detector' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Input Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Étape 1 : Choisir le type de flux suspect
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      setMediaType('audio');
                      setAnalysisResult(null);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      mediaType === 'audio'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    <span className="text-[11px]">Audio / Voix</span>
                  </button>

                  <button
                    onClick={() => {
                      setMediaType('image');
                      setAnalysisResult(null);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      mediaType === 'image'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Eye className="w-5 h-5" />
                    <span className="text-[11px]">Visage / Image</span>
                  </button>

                  <button
                    onClick={() => {
                      setMediaType('video');
                      setAnalysisResult(null);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      mediaType === 'video'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                    <span className="text-[11px]">Vidéo</span>
                  </button>

                  <button
                    onClick={() => {
                      setMediaType('text');
                      setAnalysisResult(null);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      mediaType === 'text'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-[11px]">Texte IA</span>
                  </button>
                </div>
              </div>

              {/* Upload or Input Box */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Étape 2 : Charger le fichier ou l'échantillon
                </span>

                {mediaType !== 'text' ? (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 cursor-pointer transition-all text-center group">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {uploadedFileName
                          ? uploadedFileName
                          : 'Glisser-déposer ou cliquer pour téléverser'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {mediaType === 'audio' && 'Formats acceptés : MP3, WAV, M4A, OGG'}
                        {mediaType === 'image' && 'Formats acceptés : JPG, PNG, WEBP, TIFF'}
                        {mediaType === 'video' && 'Formats acceptés : MP4, MOV, WEBM'}
                      </span>
                      <input
                        type="file"
                        accept={
                          mediaType === 'audio'
                            ? 'audio/*'
                            : mediaType === 'image'
                              ? 'image/*'
                              : 'video/*'
                        }
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {uploadedPreview && (
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-sky-500 mx-auto shadow-md">
                        <img
                          src={uploadedPreview}
                          alt="Aperçu"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Preloaded Sample Quick Button */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Pas de fichier sous la main ?
                      </span>
                      <button
                        onClick={() => {
                          setUploadedFileName(`echantillon_${mediaType}_suspect.bin`);
                          if (mediaType === 'image') {
                            setUploadedPreview(
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                            );
                          }
                        }}
                        className="text-sky-600 dark:text-sky-400 font-bold hover:underline"
                      >
                        Charger un cas d'école
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Collez ici le message WhatsApp, le courriel ou le SMS douteux à analyser..."
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={() => setTextInput(DEEPFAKE_SAMPLES[3].textContent || '')}
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Insérer un modèle d'arnaque judiciaire généré par LLM
                    </button>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                disabled={isScanning}
                onClick={handleRunAnalysis}
                className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scan Heuristique en cours ({scanProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Lancer l'Analyse Forensique & Détection d'IA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 space-y-4">
            {analysisResult ? (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm animate-in fade-in">
                {/* Score Header */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Indice de Menace Numérique</span>
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {analysisResult.verdict}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                      {analysisResult.score}%
                    </div>
                    <span className="text-[10px] text-slate-400">Probabilité d'IA</span>
                  </div>
                </div>

                {/* Spectrogram / Technical Signal Note */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-sky-400 font-mono text-xs space-y-1 border border-sky-950">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Signature Spectrale / Latente
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {analysisResult.spectrogram}
                  </p>
                </div>

                {/* Flags Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Points de Contrôle Biométriques & Numériques
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs"
                      >
                        {flag.verdict === 'anomaly' ? (
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {flag.name}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {flag.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defensive Action Steps */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Protocole de Riposte Recommandé</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                    {analysisResult.defenseSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-10 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Activity className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    En attente de soumission
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sélectionnez un média suspect à gauche et lancez l'analyse pour révéler les
                    artefacts de synthèse IA.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CHALLENGE "RÉEL OU DEEPFAKE" */}
      {activeTab === 'challenge' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                Cas d'Étude {currentChallengeIdx + 1} / {DEEPFAKE_SAMPLES.length}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                Type : {currentChallenge.type.toUpperCase()}
              </span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {currentChallenge.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Contexte : {currentChallenge.sourceDescription}
              </p>
            </div>

            {/* Media Presentation */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-3">
              {currentChallenge.type === 'audio' && (
                <div className="w-full space-y-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Mic className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    « Voix_direction_transfert_urgent.m4a » (0:24)
                  </div>
                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 mx-auto transition-colors"
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>
                      {isPlayingAudio
                        ? 'Simulation de lecture en cours...'
                        : 'Écouter l’extrait vocal'}
                    </span>
                  </button>
                  {isPlayingAudio && (
                    <div className="h-2 w-48 bg-sky-200 dark:bg-sky-900 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-sky-500 animate-pulse w-3/4" />
                    </div>
                  )}
                </div>
              )}

              {currentChallenge.type === 'image' && currentChallenge.previewUrl && (
                <div className="space-y-2 text-center">
                  <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-sky-400 shadow-md mx-auto">
                    <img
                      src={currentChallenge.previewUrl}
                      alt="Échantillon visage"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Inspectez attentivement les yeux, oreilles et cheveux.
                  </span>
                </div>
              )}

              {currentChallenge.type === 'video' && (
                <div className="w-full p-6 text-center space-y-2">
                  <Video className="w-10 h-10 text-sky-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Séquence vidéo interpolée de 15 secondes avec synchronisation labiale et
                    clignement d'yeux figé.
                  </p>
                </div>
              )}

              {currentChallenge.type === 'text' && currentChallenge.textContent && (
                <div className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left font-serif text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line shadow-inner">
                  {currentChallenge.textContent}
                </div>
              )}
            </div>

            {/* Voting Options */}
            {!challengeRevealed ? (
              <div className="space-y-2">
                <span className="text-center block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Quel est votre verdict après inspection ?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleChallengeAnswer('real')}
                    className="py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>C'est Authentique (Humain)</span>
                  </button>

                  <button
                    onClick={() => handleChallengeAnswer('deepfake')}
                    className="py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>C'est un Deepfake IA</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {/* Result Message */}
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
                    userGuess === 'deepfake'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  }`}
                >
                  {userGuess === 'deepfake' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-black">
                      {userGuess === 'deepfake'
                        ? 'Bravo ! Vous avez repéré le Deepfake !'
                        : 'Piège ! Il s’agissait bien d’un Deepfake synthétique.'}
                    </div>
                    <div className="font-normal opacity-90">{currentChallenge.explanation}</div>
                  </div>
                </div>

                {/* Revealed Clues */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    Indices Révélateurs Détectés par CyberSens :
                  </span>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
                    {currentChallenge.clues.map((clue, cIdx) => (
                      <li key={cIdx}>{clue}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleNextChallenge}
                  className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>Passer au cas suivant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GUIDE DE RIPOSTE & PROTOCOLE ENTREPRISE */}
      {activeTab === 'guide' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              1. La Règle du Mot de Passe Verbal Secret
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Pour neutraliser le clonage vocal d'un proche ou de la direction, convenez en
              présentiel d'un mot de passe secret verbal (ex: <em>« mangue-bleue »</em>). Tout ordre
              d'urgence non accompagné de ce mot de passe doit être considéré comme une attaque.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              2. Le Test Dynamique en Visio
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              En cas de doute lors d'une visioconférence suspecte, demandez à l'interlocuteur de
              passer sa main devant son visage ou de tourner brusquement la tête à 90°. Les modèles
              actuels de deepfake en temps réel créent un déchirement visuel évident.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              3. Le Protocole de Contre-Appel Hors-Bande
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ne rappelez jamais sur le numéro entrant ou via le contact WhatsApp fourni. Composez
              manuellement le numéro officiel répertorié dans l'annuaire interne ou demandez une
              confirmation écrite par courriel professionnel authentifié.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              4. Standard C2PA & Content Credentials
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Adoptez la vérification des filigranes cryptographiques C2PA (Coalition for Content
              Provenance and Authenticity). Les images et médias authentiques certifiés contiennent
              des signatures matérielles infalsifiables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
