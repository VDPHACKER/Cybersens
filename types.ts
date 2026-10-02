export interface Question {
  id: string;
  category: string;
  // Libellés localisés (fr / en / es) utilisés par les questions de secours de l'IA
  difficulty:
    'Facile' | 'Moyen' | 'Difficile' | 'Easy' | 'Medium' | 'Hard' | 'Fácil' | 'Medio' | 'Difícil';
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  startTime: number;
  userAnswers: { index: number; timeTaken: number }[];
  isFinished: boolean;
}

export interface PlayerScore {
  name: string;
  score: number;
  totalTime: number;
  isMe: boolean;
}

export interface QuizHistoryEntry {
  date: string;
  score: number;
  total: number;
  mode: 'Solo' | 'Multi';
  difficulty?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: string;
  category: 'Sécurité' | 'Quiz' | 'Système' | 'Outil';
  level: 'info' | 'warning' | 'alert';
}

export type Language = 'fr' | 'en' | 'es';

export interface UserBadge {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: 'cours' | 'quiz' | 'points' | 'expert';
  unlockedAt?: string;
  unlocked: boolean;
  progressPercent: number;
}

export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  recipientName: string;
  recipientEmail?: string;
  issuedDate: string;
  score: number;
  certificateNumber: string;
  verificationHash: string;
  issuer: string;
}

export interface LiveThreatAlert {
  id: string;
  title: string;
  level: 'CRITIQUE' | 'ÉLEVÉ' | 'MODÉRÉ' | 'INFO';
  timestamp: string;
  vector: string;
  actionRequired: string;
}

export interface PhishingAnalysisResult {
  scoreDanger: number; // 0 to 100
  verdict: 'Légitime' | 'Suspect' | 'Hautement Dangereux (Phishing)';
  flags: string[];
  recommendations: string[];
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  userName: string;
  userEmail?: string;
  userTitle?: string;
  role?: 'Particulier' | 'Étudiant' | 'Professionnel' | 'Entreprise';
  level?: number;
  points?: number;
  badgesCount?: number;
  formationsCount?: number;
  userAvatar?: string;
  defaultQuizCount: number;
  defaultQuizDifficulty: string;
  language?: Language;
  onboarded?: boolean;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  communityPosts?: number;
  registeredAt?: string;
  certificates?: Certificate[];
}

export enum AppTab {
  HOME = 'home', // Accueil
  LEARN = 'learn', // Apprendre / Formations
  QUIZ = 'quiz', // Quiz
  NEWS = 'news', // Actualités
  PROFILE = 'profile', // Mon profil & Inscription
  PRACTICES = 'practices', // Bonnes pratiques
  DONATE = 'donate', // Faire un don
  AI_CHAT = 'ai_chat', // Assistant CyberGuard IA
  TOOLS = 'tools', // Boîte à outils & Scanner
  CTF = 'ctf', // Arène CTF
  GAMES = 'games', // Menaces IA
  ABOUT = 'about', // À propos / Onboarding
  DEVOPS = 'devops', // DevOps & Operations Center
  LEADERBOARD = 'leaderboard', // Classements
  COMMUNITY = 'community', // Communauté
  GUIDE = 'guide', // Guide d'utilisation
}

export interface PracticalExercise {
  title: string;
  instructions: string;
  expectedOutcome: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  sectionNumber?: string;
  content: string[];
  keyTakeaways: string[];
  audioScript?: string;
  proTip?: string;
  securityAlert?: string;
  practicalExercise?: PracticalExercise;
  diagramTitle?: string;
  diagramAscii?: string;
  codeSnippet?: {
    language: string;
    code: string;
    caption?: string;
  };
  technicalDeepDive?: {
    terminalCommand?: string;
    terminalOutput?: string;
    protocolFlow?: string;
    packetDetails?: string;
  };
  checkYourUnderstanding?: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}

export interface CourseCaseStudy {
  title: string;
  scenario: string;
  threatDetails: string;
  goodReaction: string;
  criticalMistake: string;
}

export interface CourseModule {
  id: string;
  moduleCode?: string;
  curriculumTrack?: string;
  title: string;
  lessonsCount: number;
  duration: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  icon: string;
  color: string;
  description: string;
  moduleObjectives?: string[];
  interactiveLab?: {
    id: string;
    title: string;
    type:
      'terminal' | 'packet_trace' | 'deepfake' | 'sqli_waf' | 'forensic_dump' | 'firewall_rules';
    instructions: string;
    hints?: string[];
  };
  lessons: CourseLesson[];
  caseStudy?: CourseCaseStudy;
  examQuestions?: Question[];
}

export type InteractiveLab = NonNullable<CourseModule['interactiveLab']>;

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  readTime: string;
  author: string;
  tag: string;
  image: string;
  summary: string;
  content: string[];
  keyPoints: string[];
  /** Renseignés pour les articles issus de flux externes en temps réel. */
  url?: string;
  source?: string;
  publishedAt?: string;
}

export interface BestPracticeItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  details: string;
  checklist: string[];
}

export interface CTFChallenge {
  id: string;
  title: string;
  category:
    | 'Web & Injection'
    | 'Crypto & Obfuscation'
    | 'IA & Prompt Injection'
    | 'Forensic & Reverse'
    | 'Système';
  difficulty: 'Facile' | 'Moyen' | 'Difficile' | 'Expert';
  points: number;
  description: string;
  scenario: string;
  targetData?: string;
  interactiveType?: 'text_inspect' | 'interactive_llm' | 'token_decoder' | 'sql_tester';
  flag: string;
  hints: string[];
}

export enum QuizMode {
  IDLE = 'idle',
  SOLO_CONFIG = 'solo_config',
  SOLO_PLAY = 'solo_play',
  ROOM = 'room',
  RESULT = 'result',
}
