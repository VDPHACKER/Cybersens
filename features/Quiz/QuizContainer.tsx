import React, { useState, useEffect } from 'react';
import { QuizMode, Question, QuizHistoryEntry, UserPreferences } from '../../types';
import { generateQuizQuestions } from '../../services/geminiService';
import {
  getStats,
  getQuizHistory,
  clearQuizHistory,
  getPreferences,
  savePreferences,
} from '../../services/persistenceService';
import { useI18n } from '../../services/i18n';
import { useL } from '../../components/ui';
import SoloQuiz from './SoloQuiz';
import RoomQuiz from './RoomQuiz';
import { HelpCircle, Sparkles, Users, ArrowLeft, Trophy, Play, Settings2 } from 'lucide-react';

const CyberLoading = ({
  progress,
  lang,
  t,
}: {
  progress: number;
  lang: string;
  t: (key: string, fallback?: string) => string;
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 space-y-6 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md mx-auto text-center animate-in fade-in">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 border-4 border-sky-500/20 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center font-black text-sky-400 text-sm">
        {Math.round(progress)}%
      </div>
    </div>
    <div>
      <p className="text-white font-extrabold text-base mb-1">
        {t('quiz.loading_title', 'Préparation du Quiz...')}
      </p>
      <p className="text-xs text-slate-400">
        {t('quiz.loading_subtitle', 'Génération des questions adaptées')}
      </p>
    </div>
  </div>
);

interface QuizContainerProps {
  onBack: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const L = useL();
  // Lien d'invitation (/?join=123456) : ouvre directement le quiz multijoueur avec le code prérempli
  const [joinCode] = useState(() => {
    try {
      const code = sessionStorage.getItem('cybersens-join-room') || '';
      if (code) sessionStorage.removeItem('cybersens-join-room');
      return /^\d{6}$/.test(code) ? code : '';
    } catch {
      return '';
    }
  });
  const [mode, setMode] = useState<QuizMode>(joinCode ? QuizMode.ROOM : QuizMode.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [count, setCount] = useState(prefs.defaultQuizCount || 10);
  const [difficulty, setDifficulty] = useState(prefs.defaultQuizDifficulty || 'Moyen');

  const [localStats, setLocalStats] = useState(getStats());
  const [history, setHistory] = useState<QuizHistoryEntry[]>(getQuizHistory());

  const startSolo = async (totalRequested: number, diff: string) => {
    setIsLoading(true);
    setLoadingProgress(30);
    setQuestions([]);

    const masterBank: Question[] = [
      {
        id: 'mb-1',
        category: 'Mots de passe',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What is the best way to create a secure password?'
            : language === 'es'
              ? '¿Cuál est la mejor forma de crear una contraseña segura?'
              : 'Quelle est la meilleure façon de créer un mot de passe sécurisé ?',
        options: [
          language === 'en'
            ? 'Use your first name and birth year'
            : language === 'es'
              ? 'Usar tu nombre y año de nacimiento'
              : 'Utiliser son prénom et son année de naissance',
          language === 'en'
            ? 'Use at least 12 characters with letters, numbers, and symbols'
            : language === 'es'
              ? 'Usar al menos 12 caracteres con letras, números y símbolos'
              : 'Utiliser au moins 12 caractères avec lettres, chiffres et symboles',
          language === 'en'
            ? 'Use the same password for all accounts'
            : language === 'es'
              ? 'Usar la misma contraseña en todas las cuentas'
              : 'Utiliser le même mot de passe pour tous ses comptes',
          language === 'en'
            ? 'Write it on a sticky note'
            : language === 'es'
              ? 'Escribirla en una nota adhesiva'
              : 'Noter son mot de passe sur un post-it',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'A good password is long, unique, and complex.'
            : language === 'es'
              ? 'Una buena contraseña es larga, única y compleja.'
              : 'Un bon mot de passe est long, unique et contient un mélange de majuscules, minuscules, chiffres et caractères spéciaux.',
      },
      {
        id: 'mb-2',
        category: 'Phishing',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What must you check first before clicking a link in a suspicious email?'
            : language === 'es'
              ? '¿Qué debes comprobar primero antes de hacer clic en un enlace?'
              : 'Que devez-vous vérifier en priorité avant de cliquer sur un lien dans un e-mail suspect ?',
        options: [
          language === 'en'
            ? 'Sender display name'
            : language === 'es'
              ? 'Nombre de visualización del remitente'
              : 'Le nom d’affichage de l’expéditeur',
          language === 'en'
            ? 'The exact sender address and link domain (hovering without clicking)'
            : language === 'es'
              ? 'La dirección exacta del remitente y el dominio del enlace'
              : 'L’adresse exacte de l’expéditeur et le domaine du lien (survol sans cliquer)',
          language === 'en'
            ? 'Company logo in the email'
            : language === 'es'
              ? 'Logotipo de la empresa en el correo'
              : 'Le logo de l’entreprise dans l’e-mail',
          language === 'en'
            ? 'Time and date received'
            : language === 'es'
              ? 'Hora y fecha de recepción'
              : 'La date et l’heure de réception',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Display names can be spoofed; the true technical domain reveals the origin.'
            : language === 'es'
              ? 'Los nombres pueden ser suplantados; el dominio real revela el origen.'
              : 'Le nom d’affichage et le logo peuvent être usurpés. Seul le domaine technique réel atteste de la provenance.',
      },
      {
        id: 'mb-3',
        category: '2FA',
        difficulty: 'Facile',
        text:
          language === 'en'
            ? 'Why is Two-Factor Authentication (2FA) strongly recommended?'
            : language === 'es'
              ? '¿Por qué se recomienda encarecidamente la autenticación de dos factores (2FA)?'
              : 'Pourquoi la double authentification (2FA) est-elle fortement recommandée ?',
        options: [
          language === 'en'
            ? 'It prevents your computer from overheating'
            : language === 'es'
              ? 'Evita que tu ordenador se sobrecaliente'
              : 'Elle empêche votre ordinateur de surchauffer',
          language === 'en'
            ? 'It blocks access even if someone guesses your password'
            : language === 'es'
              ? 'Bloquea el acceso incluso si adivinan tu contraseña'
              : 'Elle bloque l’accès même si le pirate a deviné votre mot de passe',
          language === 'en'
            ? 'It completely replaces passwords'
            : language === 'es'
              ? 'Reemplaza por completo las contraseñas'
              : 'Elle remplace complètement le mot de passe',
          language === 'en'
            ? 'It speeds up your internet connection'
            : language === 'es'
              ? 'Acelera la conexión a internet'
              : 'Elle accélère le débit de votre connexion Internet',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'The second factor protects your account even after a password leak.'
            : language === 'es'
              ? 'El segundo factor protege tu cuenta tras una filtración de contraseña.'
              : 'Le second facteur (code temporaire sur application ou clé physique) protège votre compte même après une fuite de mot de passe.',
      },
      {
        id: 'mb-4',
        category: 'Réseaux',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What is the main risk of using public Wi-Fi without a VPN?'
            : language === 'es'
              ? '¿Cuál es el principal riesgo de usar Wi-Fi público sin VPN?'
              : 'Quel est le risque principal lors de l’utilisation d’un réseau Wi-Fi public sans VPN ?',
        options: [
          language === 'en'
            ? 'Your battery drains twice as fast'
            : language === 'es'
              ? 'Tu batería se descarga más rápido'
              : 'Votre batterie se décharge deux fois plus vite',
          language === 'en'
            ? 'An attacker on the same network can intercept unencrypted traffic'
            : language === 'es'
              ? 'Un atacante en la misma red puede interceptar tu tráfico no cifrado'
              : 'Un cyberattaquant sur le même réseau peut intercepter vos échanges non chiffrés',
          language === 'en'
            ? 'Your phone number becomes public'
            : language === 'es'
              ? 'Tu número de teléfono se hace público'
              : 'Votre numéro de téléphone est automatiquement rendu public',
          language === 'en'
            ? 'Your screen freezes'
            : language === 'es'
              ? 'Tu pantalla se congela'
              : 'L’écran de votre appareil se fige',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Open public Wi-Fi is susceptible to Man-in-the-Middle wiretapping.'
            : language === 'es'
              ? 'El Wi-Fi público abierto es vulnerable a escuchas Man-in-the-Middle.'
              : 'Sur un Wi-Fi public ouvert, des écoutes clandestines permettent d’intercepter des données sensibles.',
      },
      {
        id: 'mb-5',
        category: 'Sauvegardes',
        difficulty: 'Facile',
        text:
          language === 'en'
            ? 'What is the recommended method to guard against ransomware?'
            : language === 'es'
              ? '¿Cuál es el método recomendado para protegerse contra ransomware?'
              : 'Quelle est la méthode recommandée pour se prémunir d’un ransomware (rançongiciel) ?',
        options: [
          language === 'en'
            ? 'Pay the ransom immediately'
            : language === 'es'
              ? 'Pagar el rescate inmediatamente'
              : 'Payer la rançon immédiatement',
          language === 'en'
            ? 'Regularly back up data to an offline disconnected medium'
            : language === 'es'
              ? 'Hacer copias de seguridad en un soporte desconecté (offline)'
              : 'Sauvegarder régulièrement ses données sur un support déconnecté (hors ligne)',
          language === 'en'
            ? 'Turn off your computer screen'
            : language === 'es'
              ? 'Apagar la pantalla del ordenador'
              : 'Éteindre son écran d’ordinateur',
          language === 'en'
            ? 'Disable your antivirus'
            : language === 'es'
              ? 'Desactivar el antivirus'
              : 'Désactiver l’antivirus',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Offline backups ensure safe restoration without paying criminals.'
            : language === 'es'
              ? 'Las copias sin conexión garantizan una restauración segura.'
              : 'Une sauvegarde déconnectée permet de restaurer l’intégralité de ses fichiers sains sans céder au chantage.',
      },
      {
        id: 'mb-6',
        category: 'Ingénierie Sociale',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What is CEO Fraud (BEC)?'
            : language === 'es'
              ? '¿Qué es el Fraude del CEO (BEC)?'
              : 'Qu’est-ce que la Fraude au Président (BEC) ?',
        options: [
          language === 'en'
            ? 'A computer virus affecting spreadsheets'
            : language === 'es'
              ? 'Un virus informático'
              : 'Un virus informatique',
          language === 'en'
            ? 'An impersonation scam ordering urgent secret wire transfers'
            : language === 'es'
              ? 'Una estafa de suplantación ordenando transferencias urgentes'
              : 'Une escroquerie par usurpation d’identité ordonnant un virement urgent',
          language === 'en'
            ? 'A hardware failure in servers'
            : language === 'es'
              ? 'Un fallo de hardware'
              : 'Une panne matérielle',
          language === 'en'
            ? 'A legal compliance audit'
            : language === 'es'
              ? 'Una auditoría legal'
              : 'Un audit de conformité légale',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Fraudsters impersonate executives to manipulate finance staff into fraudulent wire transfers.'
            : language === 'es'
              ? 'Los estafadores suplantan a ejecutivos para ordenar transferencias fraudulentas.'
              : 'L’escroc se fait passer pour le Directeur Général et exige un virement confidentiel urgent.',
      },
      {
        id: 'mb-7',
        category: 'Sécurité Mobile',
        difficulty: 'Facile',
        text:
          language === 'en'
            ? 'What is Smishing?'
            : language === 'es'
              ? '¿Qué es el Smishing?'
              : 'Qu’est-ce que le Smishing (phishing par SMS) ?',
        options: [
          language === 'en'
            ? 'Phishing attacks conducted via SMS text messages'
            : language === 'es'
              ? 'Ataques de phishing a través de SMS'
              : 'Des attaques de phishing menées par SMS',
          language === 'en'
            ? 'A secure messaging encryption protocol'
            : language === 'es'
              ? 'Un protocolo de cifrado'
              : 'Un protocole de chiffrement sécurisé',
          language === 'en'
            ? 'Smartphone overheating'
            : language === 'es'
              ? 'Sobrecalentamiento del teléfono'
              : 'Une surchauffe de smartphone',
          language === 'en'
            ? 'Bluetooth pairing'
            : language === 'es'
              ? 'Emparejamiento Bluetooth'
              : 'Un jumelage Bluetooth',
        ],
        correctAnswer: 0,
        explanation:
          language === 'en'
            ? 'Smishing uses SMS text messages to lure victims into clicking malicious links.'
            : language === 'es'
              ? 'El smishing usa SMS para engañar a las víctimas con enlaces maliciosos.'
              : 'Le smishing utilise les SMS pour pousser les victimes à cliquer sur des liens frauduleux.',
      },
      {
        id: 'mb-8',
        category: 'Chiffrement',
        difficulty: 'Difficile',
        text:
          language === 'en'
            ? 'What guarantees both confidentiality and integrity of web traffic?'
            : language === 'es'
              ? '¿Qué garantiza la confidencialidad e integridad del tráfico web?'
              : 'Quel protocole garantit à la fois la confidentialité et l’intégrité du trafic web ?',
        options: [
          language === 'en' ? 'HTTP' : language === 'es' ? 'HTTP' : 'HTTP',
          language === 'en' ? 'FTP' : language === 'es' ? 'FTP' : 'FTP',
          language === 'en'
            ? 'TLS (Transport Layer Security)'
            : language === 'es'
              ? 'TLS (Transport Layer Security)'
              : 'TLS (Transport Layer Security)',
          language === 'en' ? 'Telnet' : language === 'es' ? 'Telnet' : 'Telnet',
        ],
        correctAnswer: 2,
        explanation:
          language === 'en'
            ? 'TLS encrypts data in transit and ensures it is not tampered with.'
            : language === 'es'
              ? 'TLS cifra los datos en tránsito y evita manipulaciones.'
              : 'TLS chiffre les flux en transit et protège contre l’interception et la falsification.',
      },
      {
        id: 'mb-9',
        category: 'Gouvernance',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What does the Principle of Least Privilege mean?'
            : language === 'es'
              ? '¿Qué significa el Principio de Menor Privilegio?'
              : 'Que signifie le principe du moindre privilège ?',
        options: [
          language === 'en'
            ? 'Giving admin rights to all users'
            : language === 'es'
              ? 'Dar privilegios de administrador a todos'
              : 'Donner les droits admin à tout le monde',
          language === 'en'
            ? 'Granting users only the minimum permissions necessary for their work'
            : language === 'es'
              ? 'Otorgar a los usuarios solo los permisos mínimos necesarios'
              : 'N’accorder aux utilisateurs que les droits stricts nécessaires à leur mission',
          language === 'en'
            ? 'Disabling user accounts after 5 PM'
            : language === 'es'
              ? 'Desactivar cuentas a las 17:00'
              : 'Désactiver les comptes le soir',
          language === 'en'
            ? 'Using short passwords'
            : language === 'es'
              ? 'Usar contraseñas cortas'
              : 'Utiliser des mots de passe courts',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Least privilege minimizes breach impact if an account is compromised.'
            : language === 'es'
              ? 'El mínimo privilegio minimiza el impacto si una cuenta es comprometida.'
              : 'Il limite l’impact d’une compromission en évitant des droits superflus.',
      },
      {
        id: 'mb-10',
        category: 'Incidents',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What is the first operational reflex during a cyber incident?'
            : language === 'es'
              ? '¿Cuál es el primer reflejo operativo ante un ciberincidente?'
              : 'Quel est le premier réflexe opérationnel lors d’un incident de sécurité ?',
        options: [
          language === 'en'
            ? 'Format all disks immediately'
            : language === 'es'
              ? 'Formatear todos los discos'
              : 'Formater tous les disques immédiatement',
          language === 'en'
            ? 'Isolate infected systems from the network to stop lateral spread'
            : language === 'es'
              ? 'Aislar los sistemas infectados de la red'
              : 'Isoler immédiatement les machines infectées du réseau pour stopper la propagation',
          language === 'en'
            ? 'Delete all audit logs'
            : language === 'es'
              ? 'Borrar todos los registros de auditoría'
              : 'Supprimer les journaux d’audit',
          language === 'en'
            ? 'Ignore the alert'
            : language === 'es'
              ? 'Ignorar la alerta'
              : 'Ignorer l’alerte',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Network isolation stops the malware from spreading to other servers.'
            : language === 'es'
              ? 'El aislamiento de red detiene la propagación del malware.'
              : 'L’isolation réseau bloque la propagation latérale sans détruire les preuves en mémoire.',
      },
      {
        id: 'mb-11',
        category: 'IA Sécurité',
        difficulty: 'Difficile',
        text:
          language === 'en'
            ? 'What is a Prompt Injection attack in LLMs?'
            : language === 'es'
              ? '¿Qué es una inyección de prompts en LLMs?'
              : 'Qu’est-ce qu’une attaque par injection de prompt (Prompt Injection) dans une IA ?',
        options: [
          language === 'en'
            ? 'Physical damage to servers'
            : language === 'es'
              ? 'Daño físico a servidores'
              : 'Un dommage physique aux serveurs',
          language === 'en'
            ? 'Manipulating AI input to bypass safety filters and execute unauthorized instructions'
            : language === 'es'
              ? 'Manipular la entrada de la IA para eludir filtros de seguridad'
              : 'Manipuler l’entrée d’un modèle pour contourner ses filtres de sécurité et exécuter des instructions non autorisées',
          language === 'en'
            ? 'Slow internet speed'
            : language === 'es'
              ? 'Baja velocidad de internet'
              : 'Une connexion lente',
          language === 'en'
            ? 'Keyboard malfunction'
            : language === 'es'
              ? 'Fallo de teclado'
              : 'Un dysfonctionnement du clavier',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Prompt injections trick AI models into ignoring safety instructions.'
            : language === 'es'
              ? 'Las inyecciones de prompts engañan a los modelos de IA.'
              : 'L’injection de prompt détourne le comportement de l’IA en injectant des instructions malveillantes.',
      },
      {
        id: 'mb-12',
        category: 'Deepfakes',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'Which indicator commonly betrays an AI video deepfake?'
            : language === 'es'
              ? '¿Qué indicador suele delatar un deepfake de video?'
              : 'Quel indicateur trahit généralement un deepfake vidéo par IA ?',
        options: [
          language === 'en'
            ? 'Abnormal blinking rate and lip-sync mismatch'
            : language === 'es'
              ? 'Tasa de parpadeo anormal y desincronización labial'
              : 'Une fréquence anormale de clignement des yeux et un décalage labial',
          language === 'en'
            ? 'High definition color depth'
            : language === 'es'
              ? 'Profundidad de color en alta definición'
              : 'Une profondeur de couleur HD',
          language === 'en'
            ? 'Fast downloading'
            : language === 'es'
              ? 'Descarga rápida'
              : 'Un téléchargement rapide',
          language === 'en'
            ? 'Standard audio bitrate'
            : language === 'es'
              ? 'Tasa de bits de audio estándar'
              : 'Un débit audio standard',
        ],
        correctAnswer: 0,
        explanation:
          language === 'en'
            ? 'AI video models often struggle with natural eye blinking and audio-visual synchronization.'
            : language === 'es'
              ? 'Los modelos de video a menudo fallan en el parpadeo natural.'
              : 'Les modèles de génération vidéo ont souvent du mal à reproduire le clignement naturel et la synchronisation labiale.',
      },
      {
        id: 'mb-13',
        category: 'Cryptographie',
        difficulty: 'Moyen',
        text:
          language === 'en'
            ? 'What is a cryptographic hash function used for?'
            : language === 'es'
              ? '¿Para qué sirve una función hash criptográfica?'
              : 'À quoi sert une fonction de hachage cryptographique ?',
        options: [
          language === 'en'
            ? 'Compressing video files'
            : language === 'es'
              ? 'Comprimir archivos de video'
              : 'Compresser des fichiers vidéo',
          language === 'en'
            ? 'Generating a unique fixed-size fingerprint to verify data integrity'
            : language === 'es'
              ? 'Generar una huella digital única de tamaño fijo para verificar la integridad'
              : 'Générer une empreinte unique de taille fixe pour vérifier l’intégrité des données',
          language === 'en'
            ? 'Translating languages'
            : language === 'es'
              ? 'Traducir idiomas'
              : 'Traduire des langues',
          language === 'en'
            ? 'Speeding up Wi-Fi'
            : language === 'es'
              ? 'Acelerar el Wi-Fi'
              : 'Accélérer le Wi-Fi',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Hashes provide tamper-evident fingerprints for data.'
            : language === 'es'
              ? 'Los hashes proporcionan huellas dactilares para verificar modificaciones.'
              : 'Le hachage génère une empreinte infalsifiable permettant de détecter toute altération.',
      },
      {
        id: 'mb-14',
        category: 'Sécurité Cloud',
        difficulty: 'Difficile',
        text:
          language === 'en'
            ? 'What is a primary cause of cloud data leaks?'
            : language === 'es'
              ? '¿Cuál es una causa principal de fugas de datos en la nube?'
              : 'Quelle est l’une des causes principales de fuites de données dans le cloud ?',
        options: [
          language === 'en'
            ? 'Lightning storms'
            : language === 'es'
              ? 'Tormentas eléctricas'
              : 'Des tempêtes d’éclairs',
          language === 'en'
            ? 'Misconfigured storage buckets and excessive permissions'
            : language === 'es'
              ? 'Cubos de almacenamiento mal configurados y permisos excesivos'
              : 'Des buckets de stockage mal configurés (permissions publiques excessives)',
          language === 'en' ? 'Using Linux' : language === 'es' ? 'Usar Linux' : 'Utiliser Linux',
          language === 'en'
            ? 'Fiber optic cables'
            : language === 'es'
              ? 'Cables de fibra óptica'
              : 'Des câbles de fibre optique',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'Publicly accessible cloud storage buckets are frequently exposed by mistake.'
            : language === 'es'
              ? 'Los buckets de nube públicos suelen exponerse por error.'
              : 'Les erreurs de configuration des droits d’accès sur les buckets de stockage restent la cause n°1.',
      },
      {
        id: 'mb-15',
        category: 'Gouvernance',
        difficulty: 'Facile',
        text:
          language === 'en'
            ? 'What is a PSSI (Information Security Policy)?'
            : language === 'es'
              ? '¿Qué es una PSSI (Política de Seguridad)?'
              : 'Qu’est-ce qu’une PSSI (Politique de Sécurité des SI) ?',
        options: [
          language === 'en'
            ? 'A software brand'
            : language === 'es'
              ? 'Una marca de software'
              : 'Une marque de logiciel',
          language === 'en'
            ? 'The formal set of security rules and guidelines for an organization'
            : language === 'es'
              ? 'El conjunto formal de normas y directrices de seguridad para una organización'
              : 'Le recueil officiel des règles et directives de sécurité obligatoires d’une organisation',
          language === 'en'
            ? 'An internet browser'
            : language === 'es'
              ? 'Un navegador de internet'
              : 'Un navigateur web',
          language === 'en'
            ? 'A firewall device'
            : language === 'es'
              ? 'Un dispositivo cortafuegos'
              : 'Un boîtier pare-feu',
        ],
        correctAnswer: 1,
        explanation:
          language === 'en'
            ? 'PSSI formalizes security standards in compliance with ISO 27001.'
            : language === 'es'
              ? 'PSSI formaliza las normas de seguridad según ISO 27001.'
              : 'La PSSI définit les directives et responsabilités de sécurité conformes aux normes ISO 27001.',
      },
    ];

    try {
      const generated = await generateQuizQuestions(totalRequested, diff, language);
      if (generated && generated.length >= totalRequested) {
        setQuestions(generated.slice(0, totalRequested));
      } else if (generated && generated.length > 0) {
        const combined = [
          ...generated,
          ...masterBank.filter((m) => !generated.some((g) => g.id === m.id)),
        ];
        setQuestions(combined.slice(0, totalRequested));
      } else {
        throw new Error();
      }
      setLoadingProgress(100);
      setTimeout(() => {
        setMode(QuizMode.SOLO_PLAY);
        setIsLoading(false);
      }, 100);
    } catch {
      const shuffled = [...masterBank].sort(() => 0.5 - Math.random());
      setQuestions(shuffled.slice(0, totalRequested));
      setLoadingProgress(100);
      setTimeout(() => {
        setMode(QuizMode.SOLO_PLAY);
        setIsLoading(false);
      }, 50);
    }
  };

  if (isLoading) return <CyberLoading progress={loadingProgress} lang={language} t={t} />;
  if (mode === QuizMode.ROOM)
    return <RoomQuiz initialCode={joinCode} onExit={() => setMode(QuizMode.IDLE)} />;
  if (mode === QuizMode.SOLO_PLAY)
    return <SoloQuiz questions={questions} onFinish={() => setMode(QuizMode.IDLE)} />;

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 space-y-6 animate-in fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {t('quiz.title', 'Quiz CyberSens')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('quiz.subtitle', 'Teste tes connaissances et renforce tes réflexes de défense.')}
        </p>
      </div>

      {/* Main Solo Quiz Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {t('quiz.interactive_title', 'Quiz interactif')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('quiz.interactive_subtitle', 'Évaluation personnalisée de sécurité')}
            </p>
          </div>
        </div>

        {/* Count Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            {t('quiz.question_count', 'Nombre de questions')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((val) => (
              <button
                key={val}
                onClick={() => setCount(val)}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  count === val
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {val} {t('quiz.questions_short', 'questions')}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            {t('quiz.difficulty', 'Niveau de difficulté')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[t('quiz.easy', 'Facile'), t('quiz.medium', 'Moyen'), t('quiz.hard', 'Difficile')].map(
              (diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    difficulty === diff
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {diff}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => startSolo(count, difficulty)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-extrabold text-sm shadow-xl shadow-sky-600/30 transition-all active:scale-95"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{t('quiz.start', 'Lancer le quiz')}</span>
        </button>
      </div>

      {/* Multiplayer rooms */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {L('Quiz multijoueur', 'Multiplayer quiz', 'Quiz multijugador')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {L(
                'Créez une salle ou rejoignez-en une avec un code, chacun sur son téléphone',
                'Create a room or join one with a code, each on their own phone',
                'Cree una sala o únase con un código, cada uno en su teléfono',
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMode(QuizMode.ROOM)}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
        >
          {L('Jouer', 'Play', 'Jugar')}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>
            {t('quiz.history_count', 'Quiz réalisés')} : {history.length}
          </span>
        </div>
        <span>
          {t('quiz.average', 'Moyenne')} : {localStats.avgScore}%
        </span>
      </div>
    </div>
  );
};

export default QuizContainer;
