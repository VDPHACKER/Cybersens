import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { Globe, Check } from 'lucide-react';
import { UI_TEXT_TRANSLATIONS } from './uiTextTranslations';

let activeUiLanguage: Language = 'fr';

const normalizeUiText = (text: string) => text.replace(/\s+/g, ' ').trim();

export const setUiLanguage = (language: Language) => {
  activeUiLanguage = language;
};

export const getUiLanguage = () => activeUiLanguage;

export const localizeUiText = <T,>(value: T): T | string => {
  if (Array.isArray(value)) return value.map((item) => localizeUiText(item)) as T;
  if (typeof value !== 'string' || activeUiLanguage === 'fr') return value;
  const translationsForText = UI_TEXT_TRANSLATIONS[normalizeUiText(value)];
  const translated = translationsForText?.[activeUiLanguage];
  if (!translated) return value;
  const leading = value.match(/^\s*/)?.[0] || '';
  const trailing = value.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
};

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_LANG_KEY = 'cyberguard_preferred_language';

export const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.learn': 'Apprendre',
    'nav.quiz': 'Quiz',
    'nav.news': 'Actualités',
    'nav.practices': 'Pratiques',
    'nav.profile': 'Profil',
    'nav.donate': 'Faire un don',
    'nav.ai_chat': 'CyberGuard IA',
    'nav.ctf': 'Arène CTF',
    'nav.tools': 'Outils Sécu',
    'nav.games': 'Jeux Menaces',
    'nav.about': 'À Propos',

    // Header & Brand
    'brand.tagline': 'Sensibiliser • Protéger • Agir',
    'header.sound_on': 'Couper l’ambiance sonore',
    'header.sound_off': 'Activer l’ambiance sonore',
    'header.theme_light': 'Passer en mode clair',
    'header.theme_dark': 'Passer en mode sombre',
    'header.alerts': 'Alertes & Notifications',
    'header.user_menu': 'Espace Compte & Profil',
    'header.my_profile': 'Mon Profil Apprenant',
    'header.change_avatar': 'Changer ma photo de profil',
    'header.logout': 'Se déconnecter',
    'header.login': 'Connexion / Inscription',
    'header.guest_badge': 'Mode Invité',
    'header.certified_badge': 'Certifié',

    // Home Screen
    'home.greeting': 'Bonjour',
    'home.tagline': 'La cybersécurité commence par toi !',
    'home.level': 'Niveau',
    'home.certificates': 'Certificats',
    'home.search_placeholder': 'Rechercher un sujet, un conseil, une arnaque...',
    'home.clear': 'Effacer',
    'home.hero_badge': 'CyberSens Alerte & Conseil',
    'home.hero_title': 'Reste vigilant sur internet !',
    'home.hero_desc':
      'Identifie les menaces, adopte les bons réflexes et obtiens ton certificat officiel en cybersécurité.',
    'home.btn_learn_more': 'En savoir plus',
    'home.btn_start_course': 'Commencer un cours',
    'home.btn_scan_scam': 'Scanner une arnaque',
    'home.support_badge': 'Soutenez CyberSens',
    'home.support_title':
      'Chaque achat de ce livre aide CyberSens à former davantage de personnes, à développer des contenus de qualité et à rendre la cybersécurité plus accessible à tous.',
    'home.support_cta': 'Acheter le livre',
    'home.support_detail':
      'Découvrez le livre La Guerre invisible : IA et Cybersécurité de VDPHACKER, un guide pratique qui explique comment les IA peuvent protéger ou attaquer les systèmes, et pourquoi la vigilance humaine reste le vrai atout de défense.',

    // Donation page
    'donate.eyebrow': 'Soutenez',
    'donate.title': 'Acheter le livre',
    'donate.back': 'Revenir',
    'donate.description':
      'Chaque achat de ce livre soutient CyberSens, finance de nouveaux contenus pédagogiques et aide à former plus de personnes à la cybersécurité avec des méthodes concrètes et accessibles.',
    'donate.hook_label': 'L’outil qui change la vigilance',
    'donate.hook':
      'L’IA peut attaquer… mais elle peut aussi vous aider à vous protéger avant qu’il soit trop tard.',
    'donate.book_title': 'La Guerre invisible : IA et cybersécurité',
    'donate.book_value':
      'Ce livre explique comment l’intelligence artificielle renforce les attaques, les arnaques et les fraudes, tout en montrant concrètement les moyens de se protéger, d’anticiper les menaces et d’agir avant qu’un incident ne devienne catastrophique.',
    'donate.book_summary_title': 'Sommaire',
    'donate.book_summary':
      'Partie I — Comprendre les fondations | Partie II — L’IA comme arme | Partie III — L’IA comme bouclier | Partie IV — Se défendre concrètement | Partie V — Annexes pratiques et ressources',
    'donate.why_title': 'Pourquoi ce livre est important',
    'donate.why_text':
      'Parce que la cybersécurité ne se joue plus seulement sur des logiciels : elle dépend aussi de la vigilance humaine, du bon réflexe et de la compréhension des outils que les attaquants utilisent aujourd’hui.',
    'donate.card_training_title': 'Formations',
    'donate.card_training_desc': 'Créer de nouveaux parcours',
    'donate.card_simulations_title': 'Simulations',
    'donate.card_simulations_desc': 'Développer des scénarios réalistes',
    'donate.card_accessibility_title': 'Accessibilité',
    'donate.card_accessibility_desc': 'Rendre la formation plus utile',
    'donate.contribution': 'Support',
    'donate.amount': '15 000 FCFA',
    'donate.amount_hint': 'Le prix de la connaissance, à l’accessibilité de chacun',
    'donate.cta': 'Acheter le livre',
    'donate.learn_more': 'En savoir plus',
    'donate.reassurance_short': 'Achat sécurisé · soutien direct à CyberSens',
    'donate.popup_close': 'Fermer',
    'donate.popup_mute': 'Ne plus afficher aujourd’hui',
    'donate.note':
      'Achetez le livre et soutenez directement CyberSens pour financer de nouveaux cours, ateliers, simulations et contenus pédagogiques.',
    'donate.alert': 'Achat du livre et soutien direct à CyberSens.',

    // Home Cards
    'home.card_learn': 'Formations',
    'home.card_learn_sub': 'Apprendre avec certificat',
    'home.card_quiz': 'Quiz',
    'home.card_quiz_sub': 'Tester ses connaissances',
    'home.card_practices': 'Bonnes pratiques',
    'home.card_practices_sub': 'Se protéger au quotidien',
    'home.card_news': 'Actualités',
    'home.card_news_sub': 'Alertes & veille en direct',

    // Recommended
    'home.recommended_title': 'Recommandé pour toi',
    'home.see_all': 'Voir tout',
    'home.priority_tips': 'Conseils prioritaires',

    // Innovations
    'home.innovations_title': 'Innovations & Laboratoires Pratiques',
    'home.scanner_title': 'Scanner Anti-Phishing',
    'home.scanner_sub': "Détection d'arnaques SMS/Mail",
    'home.aichat_title': 'CyberGuard IA',
    'home.aichat_sub': 'Assistant & Détection',
    'home.ctf_title': 'Arène CTF',
    'home.ctf_sub': 'Défis éthiques pratiques',
    'home.tools_title': 'Outils Sécu & Testeurs',
    'home.tools_sub': 'Deepfakes, Liens, Mots de passe, Logs',

    // Learn Screen
    'learn.title': 'Apprendre & Se Former',
    'learn.subtitle':
      'Parcours e-learning complets avec laboratoires pratiques, simulations, audio et certificat officiel de réussite.',
    'learn.unlocked_certs': 'Certificat(s) Débloqué(s)',
    'learn.stat_courses': 'Formations',
    'learn.stat_courses_sub': 'Pratiques & interactives',
    'learn.stat_cert': 'Certificat',
    'learn.stat_cert_sub': 'À chaque module réussi',
    'learn.stat_audio': 'Synthèse Audio',
    'learn.stat_audio_sub': 'Écoute en mobilité',
    'learn.search_placeholder':
      'Rechercher une formation (ex: Phishing, Mots de passe, Mobile Money, IA)...',
    'learn.all': 'Tous',
    'learn.beginner': 'Débutant',
    'learn.intermediate': 'Intermédiaire',
    'learn.advanced': 'Avancé',
    'learn.certified_badge': 'Certifié',
    'learn.lessons': 'leçons',
    'learn.no_results': 'Aucune formation trouvée',
    'learn.try_another_search': 'Essayez un autre mot-clé ou niveau.',

    // Practices Screen
    'practices.title': 'Bonnes pratiques',
    'practices.subtitle': 'Des gestes simples et quotidiens pour une cyber-protection maximale.',
    'practices.tab_reflexes': 'Guide des Réflexes Vitaux',
    'practices.tab_deepfakes': 'Testeur de Deepfakes IA',
    'practices.badge_new': 'Nouveau',
    'practices.vital_count': '6 réflexes vitaux',
    'practices.actions_title': 'Actions recommandées (+10 XP par validation) :',

    // App shell / quiz
    'app.loading': 'Chargement de votre espace…',
    'app.offline':
      'Impossible de joindre le serveur CyberSens. Connectez-vous une première fois avec une connexion Internet : l’application fonctionnera ensuite aussi hors ligne sur cet appareil.',
    'app.retry': 'Réessayer',
    'quiz.title': 'Quiz CyberSens',
    'quiz.subtitle': 'Teste tes connaissances et renforce tes réflexes de défense.',
    'quiz.loading_title': 'Préparation du Quiz...',
    'quiz.loading_subtitle': 'Génération des questions adaptées',
    'quiz.interactive_title': 'Quiz interactif',
    'quiz.interactive_subtitle': 'Évaluation personnalisée de sécurité',
    'quiz.question_count': 'Nombre de questions',
    'quiz.questions_short': 'questions',
    'quiz.difficulty': 'Niveau de difficulté',
    'quiz.easy': 'Facile',
    'quiz.medium': 'Moyen',
    'quiz.hard': 'Difficile',
    'quiz.start': 'Lancer le quiz',
    'quiz.history_count': 'Quiz réalisés',
    'quiz.completed_title': 'Quiz terminé !',
    'quiz.result_excellent': 'Excellent score ! Vos réflexes sont solides.',
    'quiz.result_good': 'Bon entraînement, continuez à vous former !',
    'quiz.success_rate': 'de réussite',
    'quiz.xp_suffix': 'points d’expérience',
    'quiz.restart': 'Recommencer le quiz',
    'quiz.back_to_quizzes': 'Retourner aux quiz',
    'quiz.label': 'Quiz',
    'quiz.question_counter': 'Question',
    'quiz.answer_correct': 'Bonne réponse !',
    'quiz.answer_wrong': 'Attention !',
    'quiz.next_question': 'Question suivante',
    'quiz.view_results': 'Voir les résultats',

    // Deepfake Tester
    'deepfake.title': 'Testeur & Analyseur de Deepfakes IA',
    'deepfake.subtitle':
      "Détectez les voix clonées, visages synthétiques et fraudes d'ingénierie sociale générées par IA.",
    'deepfake.tab_audio': 'Analyseur Audio / Note Vocale',
    'deepfake.tab_video': 'Analyseur Visage & Vidéo',
    'deepfake.tab_library': 'Exemples Réels & Détection',
    'deepfake.verdict_fake': 'Alerte : Forte probabilité de Deepfake synthétique',
    'deepfake.verdict_legit': 'Indicateurs cohérents : Média a priori authentique',
    'deepfake.analyze_btn': "Lancer l'analyse heuristique IA",

    // News Screen
    'news.title': 'Actualités & Veille Cyber',
    'news.subtitle':
      "Flux d'informations actualisé en direct sur les menaces, alertes et bons réflexes.",
    'news.live_badge': 'LIVE',
    'news.refresh_btn': 'Actualiser en direct',
    'news.refreshing': 'Actualisation...',
    'news.urgent_alert': 'Alerte Urgence Cyber',
    'news.scan_sms': 'Scanner un SMS',
    'news.vigilance_title': 'Indice de Vigilance Régional',
    'news.vigilance_level': 'ÉLEVÉ',
    'news.vigilance_desc':
      "Menaces prédominantes aujourd'hui : Hameçonnage bancaire, faux livreurs & vol de sessions.",
    'news.scanner_btn': "Détecteur d'Arnaque IA",
    'news.breaking_alert_title':
      'Campagne active de faux SMS bancaires et Mobile Money détectée en Afrique de l’Ouest',
    'news.breaking_alert_vector': 'SMS / Smishing',
    'news.breaking_alert_action': 'Ne composez aucun code USSD et ne partagez aucun PIN.',
    'news.breaking_alert_refresh_title':
      'Alerte Urgence : Fausses invitations de réinitialisation WhatsApp en circulation',
    'news.breaking_alert_refresh_summary':
      'Des cybercriminels envoient des SMS demandant un code à 6 chiffres pour prétendument sécuriser votre compte WhatsApp.',
    'news.refresh_minutes_ago': 'Il y a {{minutes}} min',
    'news.just_now': 'À l’instant',
    'news.all': 'Toutes',
    'news.threats': 'Menaces',
    'news.tips': 'Conseils',
    'news.events': 'Événements',

    // Profile Screen
    'profile.tab_profile': 'Mon Profil',
    'profile.tab_register': 'Inscription / Connexion',
    'profile.tab_badges': 'Badges',
    'profile.tab_certs': 'Certificats',
    'profile.certified_account': 'Compte Certifié',
    'profile.level_prefix': 'Niveau',
    'profile.xp_suffix': "Points d'expérience",
    'profile.settings_btn': 'Paramètres',
    'profile.stat_progression': 'Progression',
    'profile.stat_badges': 'Badges acquis',
    'profile.stat_certs': 'Certificats',
    'profile.link_courses': 'Mes formations e-learning',
    'profile.link_quizzes': 'Mes quiz',
    'profile.link_badges': 'Mes badges de progression',
    'profile.link_certs': 'Mes certificats officiels',
    'profile.link_favorites': 'Mes favoris',
    'profile.link_help': 'Aide & support CyberGuard IA',
    'profile.btn_logout': 'Se déconnecter',
    'profile.btn_reset': 'Réinitialiser',
    'profile.badges_title': 'Badges de Progression Dynamiques',
    'profile.badges_subtitle':
      "Débloquez de nouveaux titres d'honneur en réussissant les quiz et modules d'apprentissage.",
    'profile.certs_title': 'Mes Certificats Officiels CyberSens',
    'profile.certs_subtitle':
      'Diplômes et attestations de compétences vérifiables avec identifiant unique sous la direction de VDPHACKER.',
    'profile.no_certs': 'Aucun certificat pour le moment',
    'profile.no_certs_desc':
      "Suivez une formation dans l'onglet Apprendre et validez l'évaluation finale pour obtenir votre premier certificat officiel.",
    'profile.start_training': 'Démarrer une formation',
    'profile.view_print': 'Voir & Imprimer',
    'profile.guest_warning':
      'Vous êtes en session invité. Connectez-vous pour certifier vos résultats.',
    'profile.btn_connect': 'Se connecter maintenant',
    'profile.logout_success': 'Déconnexion réussie ! Vous êtes en mode invité.',
    'profile.avatar_change_title': 'Changer ma photo de profil',
    'profile.avatar_save_btn': 'Enregistrer la photo',
    'profile.avatar_saved_success': 'Photo de profil mise à jour avec succès !',

    // Registration & Auth
    'auth.title_register': 'Inscription Apprenant CyberSens',
    'auth.title_login': 'Connexion à CyberSens',
    'auth.subtitle_register':
      'Créez votre profil pour certifier vos compétences et sauvegarder vos diplômes en cybersécurité.',
    'auth.subtitle_login': 'Retrouvez votre progression, vos scores et vos certificats officiels.',
    'auth.mode_register': 'Créer un compte',
    'auth.mode_login': "J'ai déjà un compte",
    'auth.fullname': "Nom complet (tel qu'il apparaîtra sur vos certificats) *",
    'auth.email': 'Adresse e-mail professionnelle ou personnelle *',
    'auth.password': 'Mot de passe sécurisé (12+ caractères recommandés) *',
    'auth.role': "Type d'apprenant / Secteur :",
    'auth.btn_register': 'Créer mon compte CyberSens',
    'auth.btn_login': 'Accéder à mon espace apprenant',
    'auth.disclaimer':
      'En vous inscrivant, vous accédez gratuitement à toutes les formations et certifications officielles CyberSens.',

    // Common
    'common.back': 'Retour',
    'common.points': 'pts',
    'common.level': 'Niveau',
    'common.close': 'Fermer',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.saved': 'Modifications enregistrées !',
    'common.search': 'Rechercher',
    'common.all': 'Tous',
    'common.completed': 'Terminé',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.learn': 'Learn',
    'nav.quiz': 'Quiz',
    'nav.news': 'News',
    'nav.practices': 'Practices',
    'nav.profile': 'Profile',
    'nav.donate': 'Donate',
    'nav.ai_chat': 'CyberGuard AI',
    'nav.ctf': 'CTF Arena',
    'nav.tools': 'Sec Tools',
    'nav.games': 'Threat Games',
    'nav.about': 'About',

    // Header & Brand
    'brand.tagline': 'Educate • Protect • Act',
    'header.sound_on': 'Mute ambient sound',
    'header.sound_off': 'Enable ambient sound',
    'header.theme_light': 'Switch to light mode',
    'header.theme_dark': 'Switch to dark mode',
    'header.alerts': 'Alerts & Notifications',
    'header.user_menu': 'User Account & Profile',
    'header.my_profile': 'My Learner Profile',
    'header.change_avatar': 'Change Profile Picture',
    'header.logout': 'Sign Out',
    'header.login': 'Sign In / Register',
    'header.guest_badge': 'Guest Mode',
    'header.certified_badge': 'Certified',

    // Home Screen
    'home.greeting': 'Hello',
    'home.tagline': 'Cybersecurity starts with you!',
    'home.level': 'Level',
    'home.certificates': 'Certificates',
    'home.search_placeholder': 'Search a topic, security tip, phishing scam...',
    'home.clear': 'Clear',
    'home.hero_badge': 'CyberSens Alert & Advisory',
    'home.hero_title': 'Stay vigilant online!',
    'home.hero_desc':
      'Identify threats, adopt safe digital habits, and earn your official cybersecurity certificate.',
    'home.btn_learn_more': 'Learn more',
    'home.btn_start_course': 'Start a course',
    'home.btn_scan_scam': 'Scan a scam',
    'home.support_badge': 'Support CyberSens',
    'home.support_title':
      'Every purchase of this book helps CyberSens train more people, create better content and make cybersecurity more accessible to everyone.',
    'home.support_cta': 'Buy the book',
    'home.support_detail':
      'Discover The Invisible War: AI and Cybersecurity by VDPHACKER, a practical guide that explains how AI can protect or attack systems and why human vigilance remains the strongest defense.',

    // Donation page
    'donate.eyebrow': 'Support',
    'donate.title': 'Buy the book',
    'donate.back': 'Back',
    'donate.description':
      'Every purchase of this book supports CyberSens, funds more educational content and helps train more people in cybersecurity through practical, accessible learning.',
    'donate.book_title': 'The Invisible War: AI and Cybersecurity',
    'donate.book_value':
      'This book explains how artificial intelligence amplifies phishing, scams, identity fraud, and large-scale cyberattacks, while showing concrete ways to defend yourself, anticipate threats, and act before risk becomes a crisis.',
    'donate.book_summary_title': 'Table of contents',
    'donate.book_summary':
      'Part I — Building the foundations | Part II — AI as a weapon | Part III — AI as a shield | Part IV — Defending ourselves today | Part V — Practical annexes and resources',
    'donate.card_training_title': 'Courses',
    'donate.card_training_desc': 'Create new learning paths',
    'donate.card_simulations_title': 'Simulations',
    'donate.card_simulations_desc': 'Develop realistic scenarios',
    'donate.card_accessibility_title': 'Accessibility',
    'donate.card_accessibility_desc': 'Make learning more useful',
    'donate.contribution': 'Support',
    'donate.amount': '$25 USD',
    'donate.amount_hint': 'The price of knowledge, at a human scale',
    'donate.cta': 'Buy the book',
    'donate.learn_more': 'Learn more',
    'donate.reassurance_short': 'Secure purchase · direct support for CyberSens',
    'donate.popup_close': 'Close',
    'donate.popup_mute': 'Don’t show again today',
    'donate.reassurance':
      'Simple payment, secure purchase, all authorized payment methods accepted, and direct support for CyberSens.',
    'donate.note':
      'Buy the book and support CyberSens directly to fund new training, workshops, simulations and educational content.',
    'donate.alert': 'Book purchase and direct support for CyberSens.',
    'donate.hook_label': 'The tool that changes vigilance',
    'donate.hook':
      'AI can attack… but it can also help you protect yourself before it is too late.',
    'donate.why_title': 'Why this book matters',
    'donate.why_text':
      'Because cybersecurity is no longer only about software: it also depends on human vigilance, the right reflexes, and understanding the tools attackers use today.',

    // Home Cards
    'home.card_learn': 'Courses',
    'home.card_learn_sub': 'Learn with certificate',
    'home.card_quiz': 'Quizzes',
    'home.card_quiz_sub': 'Test your knowledge',
    'home.card_practices': 'Best practices',
    'home.card_practices_sub': 'Protect yourself daily',
    'home.card_news': 'News',
    'home.card_news_sub': 'Live threat monitoring',

    // Recommended
    'home.recommended_title': 'Recommended for you',
    'home.see_all': 'View all',
    'home.priority_tips': 'Priority advice',

    // Innovations
    'home.innovations_title': 'Innovations & Practical Labs',
    'home.scanner_title': 'Anti-Phishing Scanner',
    'home.scanner_sub': 'Detect SMS/Email scams',
    'home.aichat_title': 'CyberGuard AI',
    'home.aichat_sub': 'Assistant & Detection',
    'home.ctf_title': 'CTF Arena',
    'home.ctf_sub': 'Ethical hands-on hacking',
    'home.tools_title': 'Security Tools & Testers',
    'home.tools_sub': 'Deepfakes, Links, Passwords, Logs',

    // Learn Screen
    'learn.title': 'Learn & Get Trained',
    'learn.subtitle':
      'Comprehensive e-learning paths with interactive labs, simulations, audio narration and official certificates.',
    'learn.unlocked_certs': 'Certificate(s) Unlocked',
    'learn.stat_courses': 'Courses',
    'learn.stat_courses_sub': 'Hands-on & interactive',
    'learn.stat_cert': 'Certificate',
    'learn.stat_cert_sub': 'For every passed module',
    'learn.stat_audio': 'Audio Narration',
    'learn.stat_audio_sub': 'Listen on the go',
    'learn.search_placeholder': 'Search courses (e.g., Phishing, Passwords, Mobile Money, AI)...',
    'learn.all': 'All',
    'learn.beginner': 'Beginner',
    'learn.intermediate': 'Intermediate',
    'learn.advanced': 'Advanced',
    'learn.certified_badge': 'Certified',
    'learn.lessons': 'lessons',
    'learn.no_results': 'No courses found',
    'learn.try_another_search': 'Try another keyword or level.',

    // Practices Screen
    'practices.title': 'Best Practices',
    'practices.subtitle': 'Simple daily actions for maximum digital defense.',
    'practices.tab_reflexes': 'Vital Reflexes Guide',
    'practices.tab_deepfakes': 'AI Deepfake Tester',
    'practices.badge_new': 'New',
    'practices.vital_count': '6 vital reflexes',
    'practices.actions_title': 'Recommended actions (+10 XP each):',

    // App shell / quiz
    'app.loading': 'Loading your space…',
    'app.offline':
      'Unable to reach the CyberSens server. Sign in once with an internet connection: the app will also work offline on this device.',
    'app.retry': 'Retry',
    'quiz.title': 'CyberSens Quiz',
    'quiz.subtitle': 'Test your knowledge and strengthen your defense reflexes.',
    'quiz.loading_title': 'Preparing the Quiz...',
    'quiz.loading_subtitle': 'Generating tailored questions',
    'quiz.interactive_title': 'Interactive Quiz',
    'quiz.interactive_subtitle': 'Personalized security assessment',
    'quiz.question_count': 'Number of questions',
    'quiz.questions_short': 'questions',
    'quiz.difficulty': 'Difficulty level',
    'quiz.easy': 'Easy',
    'quiz.medium': 'Medium',
    'quiz.hard': 'Hard',
    'quiz.start': 'Start quiz',
    'quiz.history_count': 'Quizzes completed',
    'quiz.completed_title': 'Quiz complete!',
    'quiz.result_excellent': 'Excellent score! Your reflexes are solid.',
    'quiz.result_good': 'Good practice, keep training!',
    'quiz.success_rate': 'success rate',
    'quiz.xp_suffix': 'experience points',
    'quiz.restart': 'Restart quiz',
    'quiz.back_to_quizzes': 'Back to quizzes',
    'quiz.label': 'Quiz',
    'quiz.question_counter': 'Question',
    'quiz.answer_correct': 'Correct answer!',
    'quiz.answer_wrong': 'Watch out!',
    'quiz.next_question': 'Next question',
    'quiz.view_results': 'View results',

    // Deepfake Tester
    'deepfake.title': 'AI Deepfake Tester & Analyzer',
    'deepfake.subtitle':
      'Detect cloned voices, synthetic faces and AI-generated social engineering fraud.',
    'deepfake.tab_audio': 'Voice Note / Audio Analyzer',
    'deepfake.tab_video': 'Face & Video Analyzer',
    'deepfake.tab_library': 'Real Cases & Detection',
    'deepfake.verdict_fake': 'Warning: High probability of synthetic deepfake',
    'deepfake.verdict_legit': 'Consistent indicators: Likely authentic media',
    'deepfake.analyze_btn': 'Run heuristic AI scan',

    // News Screen
    'news.title': 'News & Cyber Watch',
    'news.subtitle': 'Real-time updated feed on active threats, alerts and digital hygiene.',
    'news.live_badge': 'LIVE',
    'news.refresh_btn': 'Refresh live',
    'news.refreshing': 'Refreshing...',
    'news.urgent_alert': 'Cyber Threat Alert',
    'news.scan_sms': 'Scan an SMS',
    'news.vigilance_title': 'Regional Threat Index',
    'news.vigilance_level': 'HIGH',
    'news.vigilance_desc':
      'Dominant threats today: Banking phishing, fake delivery messages & session hijacking.',
    'news.scanner_btn': 'AI Scam Scanner',
    'news.breaking_alert_title':
      'Active campaign of fake banking and Mobile Money SMS detected in West Africa',
    'news.breaking_alert_vector': 'SMS / Smishing',
    'news.breaking_alert_action': 'Do not enter any USSD code and never share any PIN.',
    'news.breaking_alert_refresh_title':
      'Urgent Alert: Fake WhatsApp reset invitations circulating',
    'news.breaking_alert_refresh_summary':
      'Cybercriminals are sending SMS messages asking for a 6-digit code to supposedly secure your WhatsApp account.',
    'news.refresh_minutes_ago': '{{minutes}} min ago',
    'news.just_now': 'Just now',
    'news.all': 'All',
    'news.threats': 'Threats',
    'news.tips': 'Advice',
    'news.events': 'Events',

    // Profile Screen
    'profile.tab_profile': 'My Profile',
    'profile.tab_register': 'Sign Up / Sign In',
    'profile.tab_badges': 'Badges',
    'profile.tab_certs': 'Certificates',
    'profile.certified_account': 'Verified Account',
    'profile.level_prefix': 'Level',
    'profile.xp_suffix': 'Experience Points',
    'profile.settings_btn': 'Settings',
    'profile.stat_progression': 'Progress',
    'profile.stat_badges': 'Badges earned',
    'profile.stat_certs': 'Certificates',
    'profile.link_courses': 'My e-learning courses',
    'profile.link_quizzes': 'My quizzes',
    'profile.link_badges': 'My progression badges',
    'profile.link_certs': 'My official certificates',
    'profile.link_favorites': 'My favorites',
    'profile.link_help': 'CyberGuard AI help & support',
    'profile.btn_logout': 'Sign Out',
    'profile.btn_reset': 'Reset data',
    'profile.badges_title': 'Dynamic Progression Badges',
    'profile.badges_subtitle': 'Unlock honor badges by passing quizzes and e-learning modules.',
    'profile.certs_title': 'My Official CyberSens Certificates',
    'profile.certs_subtitle':
      'Verifiable diplomas with unique identification under the supervision of Academic Director VDPHACKER.',
    'profile.no_certs': 'No certificates yet',
    'profile.no_certs_desc':
      'Complete a training module in the Learn tab and pass the final exam to get your first certificate.',
    'profile.start_training': 'Start a course',
    'profile.view_print': 'View & Print',
    'profile.guest_warning': 'You are currently in guest mode. Sign in to certify your results.',
    'profile.btn_connect': 'Sign in now',
    'profile.logout_success': 'Successfully signed out! You are now in guest mode.',
    'profile.avatar_change_title': 'Change Profile Picture',
    'profile.avatar_save_btn': 'Save picture',
    'profile.avatar_saved_success': 'Profile picture successfully updated!',

    // Registration Form
    'auth.title_register': 'CyberSens Learner Registration',
    'auth.title_login': 'Sign in to CyberSens',
    'auth.subtitle_register':
      'Create your learner profile to certify your skills and secure your official diplomas.',
    'auth.subtitle_login': 'Access your courses, badges and verified certifications.',
    'auth.mode_register': 'Create an account',
    'auth.mode_login': 'I already have an account',
    'auth.fullname': 'Full name (as shown on your certificates) *',
    'auth.email': 'Work or personal email address *',
    'auth.password': 'Secure password (12+ characters recommended) *',
    'auth.role': 'Learner category / Profile:',
    'auth.btn_register': 'Create my CyberSens account',
    'auth.btn_login': 'Access learner portal',
    'auth.disclaimer':
      'Signing up gives you full, free access to all official CyberSens courses and certificates.',

    // Common
    'common.back': 'Back',
    'common.points': 'pts',
    'common.level': 'Level',
    'common.close': 'Close',
    'common.save': 'Save settings',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.saved': 'Changes saved successfully!',
    'common.search': 'Search',
    'common.all': 'All',
    'common.completed': 'Completed',
  },

  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.learn': 'Aprender',
    'nav.quiz': 'Quiz',
    'nav.news': 'Noticias',
    'nav.practices': 'Prácticas',
    'nav.profile': 'Perfil',
    'nav.donate': 'Hacer una donación',
    'nav.ai_chat': 'CyberGuard IA',
    'nav.ctf': 'Arena CTF',
    'nav.tools': 'Herramientas',
    'nav.games': 'Juegos IA',
    'nav.about': 'Acerca de',

    // Header & Brand
    'brand.tagline': 'Concienciar • Proteger • Actuar',
    'header.sound_on': 'Silenciar sonido ambiental',
    'header.sound_off': 'Activar sonido ambiental',
    'header.theme_light': 'Cambiar a modo claro',
    'header.theme_dark': 'Cambiar a modo oscuro',
    'header.alerts': 'Alertas y Notificaciones',
    'header.user_menu': 'Espacio de Usuario y Perfil',
    'header.my_profile': 'Mi Perfil de Estudiante',
    'header.change_avatar': 'Cambiar foto de perfil',
    'header.logout': 'Cerrar sesión',
    'header.login': 'Iniciar sesión / Registro',
    'header.guest_badge': 'Modo Invitado',
    'header.certified_badge': 'Certificado',

    // Home Screen
    'home.greeting': 'Hola',
    'home.tagline': '¡La ciberseguridad empieza contigo!',
    'home.level': 'Nivel',
    'home.certificates': 'Certificados',
    'home.search_placeholder': 'Buscar un tema, consejo de seguridad, estafa...',
    'home.clear': 'Borrar',
    'home.hero_badge': 'CyberSens Alerta y Asesoría',
    'home.hero_title': '¡Permanece alerta en internet!',
    'home.hero_desc':
      'Identifica amenazas, adopta buenos hábitos y obtén tu certificado oficial de ciberseguridad.',
    'home.btn_learn_more': 'Saber más',
    'home.btn_start_course': 'Comenzar un curso',
    'home.btn_scan_scam': 'Escanear estafa',
    'home.support_badge': 'Apoya a CyberSens',
    'home.support_title':
      'Cada compra de este libro ayuda a CyberSens a formar a más personas, crear contenidos de calidad y hacer que la ciberseguridad sea más accesible para todos.',
    'home.support_cta': 'Comprar el libro',
    'home.support_detail':
      'Descubre La Guerra invisible: IA y Ciberseguridad de VDPHACKER, una guía práctica que explica cómo la IA puede proteger o atacar los sistemas y por qué la vigilancia humana sigue siendo la mejor defensa.',

    // Donation page
    'donate.eyebrow': 'Apoya',
    'donate.title': 'Comprar el libro',
    'donate.back': 'Volver',
    'donate.description':
      'Cada compra de este libro apoya a CyberSens, financia nuevos contenidos educativos y ayuda a formar a más personas en ciberseguridad con métodos prácticos y accesibles.',
    'donate.hook_label': 'La herramienta que cambia la vigilancia',
    'donate.hook':
      'La IA puede atacar… pero también puede ayudarte a protegerte antes de que sea demasiado tarde.',
    'donate.book_title': 'La Guerra invisible: IA y ciberseguridad',
    'donate.book_value':
      'Este libro explica cómo la inteligencia artificial refuerza el phishing, los fraudes, la clonación de identidad y los ataques a gran escala, mientras muestra soluciones concretas para protegerse, anticiparse a las amenazas y actuar antes de que el riesgo se convierta en crisis.',
    'donate.book_summary_title': 'Sumario',
    'donate.book_summary':
      'Parte I — Entender los fundamentos | Parte II — La IA como arma | Parte III — La IA como escudo | Parte IV — Defenderse de forma práctica | Parte V — Anexos y recursos',
    'donate.why_title': 'Por qué este libro es importante',
    'donate.why_text':
      'Porque la ciberseguridad ya no depende solo del software: también depende de la vigilancia humana, del buen instinto y de comprender las herramientas que usan los atacantes hoy en día.',
    'donate.card_training_title': 'Formaciones',
    'donate.card_training_desc': 'Crear nuevos recorridos',
    'donate.card_simulations_title': 'Simulaciones',
    'donate.card_simulations_desc': 'Desarrollar escenarios realistas',
    'donate.card_accessibility_title': 'Accesibilidad',
    'donate.card_accessibility_desc': 'Hacer la formación más útil',
    'donate.contribution': 'Apoyo',
    'donate.amount': '23 €',
    'donate.amount_hint': 'El precio del conocimiento al alcance de todos',
    'donate.cta': 'Comprar el libro',
    'donate.learn_more': 'Saber más',
    'donate.reassurance_short': 'Compra segura · apoyo directo a CyberSens',
    'donate.popup_close': 'Cerrar',
    'donate.popup_mute': 'No mostrar más hoy',
    'donate.reassurance':
      'Pago sencillo, compra segura, todas las formas de pago autorizadas y apoyo directo a CyberSens.',
    'donate.note':
      'Compra el libro y apoya directamente a CyberSens para financiar nuevos cursos, talleres, simulaciones y contenidos educativos.',
    'donate.alert': 'Compra del libro y apoyo directo a CyberSens.',

    // Home Cards
    'home.card_learn': 'Cursos',
    'home.card_learn_sub': 'Aprende con certificado',
    'home.card_quiz': 'Cuestionarios',
    'home.card_quiz_sub': 'Pon a prueba tus conocimientos',
    'home.card_practices': 'Buenas prácticas',
    'home.card_practices_sub': 'Protégete cada día',
    'home.card_news': 'Noticias',
    'home.card_news_sub': 'Vigilancia en tiempo real',

    // Recommended
    'home.recommended_title': 'Recomendado para ti',
    'home.see_all': 'Ver todo',
    'home.priority_tips': 'Consejos prioritarios',

    // Innovations
    'home.innovations_title': 'Innovaciones y Laboratorios',
    'home.scanner_title': 'Escáner Anti-Phishing',
    'home.scanner_sub': 'Detección de SMS y correos fraudulentos',
    'home.aichat_title': 'CyberGuard IA',
    'home.aichat_sub': 'Asistente y Detección',
    'home.ctf_title': 'Arena CTF',
    'home.ctf_sub': 'Retos prácticos de seguridad',
    'home.tools_title': 'Herramientas y Probadores',
    'home.tools_sub': 'Deepfakes, Enlaces, Contraseñas, Registros',

    // Learn Screen
    'learn.title': 'Aprender y Formarse',
    'learn.subtitle':
      'Rutas e-learning con laboratorios interactivos, audio y certificado oficial supervisado por VDPHACKER.',
    'learn.unlocked_certs': 'Certificado(s) Desbloqueado(s)',
    'learn.stat_courses': 'Cursos',
    'learn.stat_courses_sub': 'Prácticos e interactivos',
    'learn.stat_cert': 'Certificado',
    'learn.stat_cert_sub': 'Por cada módulo aprobado',
    'learn.stat_audio': 'Síntesis de Audio',
    'learn.stat_audio_sub': 'Escucha en movimiento',
    'learn.search_placeholder': 'Buscar cursos (ej: Phishing, Contraseñas, Pagos móviles, IA)...',
    'learn.all': 'Todos',
    'learn.beginner': 'Principiante',
    'learn.intermediate': 'Intermedio',
    'learn.advanced': 'Avanzado',
    'learn.certified_badge': 'Certificado',
    'learn.lessons': 'lecciones',
    'learn.no_results': 'No se encontraron formaciones',
    'learn.try_another_search': 'Prueba otra palabra clave o nivel.',

    // Practices Screen
    'practices.title': 'Buenas Prácticas',
    'practices.subtitle': 'Gestos simples y diarios para una máxima ciberprotección.',
    'practices.tab_reflexes': 'Guía de Reflejos Vitales',
    'practices.tab_deepfakes': 'Probador de Deepfakes IA',
    'practices.badge_new': 'Nuevo',
    'practices.vital_count': '6 reflejos vitales',
    'practices.actions_title': 'Acciones recomendadas (+10 XP cada una):',

    // App shell / quiz
    'app.loading': 'Cargando tu espacio…',
    'app.offline':
      'No se puede contactar con el servidor de CyberSens. Inicia sesión una vez con conexión a Internet: la aplicación también funcionará sin conexión en este dispositivo.',
    'app.retry': 'Reintentar',
    'quiz.title': 'Quiz CyberSens',
    'quiz.subtitle': 'Pon a prueba tus conocimientos y refuerza tus reflejos defensivos.',
    'quiz.loading_title': 'Preparando el Quiz...',
    'quiz.loading_subtitle': 'Generando preguntas personalizadas',
    'quiz.interactive_title': 'Quiz interactivo',
    'quiz.interactive_subtitle': 'Evaluación personalizada de seguridad',
    'quiz.question_count': 'Número de preguntas',
    'quiz.questions_short': 'preguntas',
    'quiz.difficulty': 'Nivel de dificultad',
    'quiz.easy': 'Fácil',
    'quiz.medium': 'Medio',
    'quiz.hard': 'Difícil',
    'quiz.start': 'Iniciar quiz',
    'quiz.history_count': 'Quizzes realizados',
    'quiz.completed_title': '¡Quiz terminado!',
    'quiz.result_excellent': '¡Excelente resultado! Tus reflejos están muy bien.',
    'quiz.result_good': '¡Buen entrenamiento, sigue formándote!',
    'quiz.success_rate': 'de éxito',
    'quiz.xp_suffix': 'puntos de experiencia',
    'quiz.restart': 'Reiniciar quiz',
    'quiz.back_to_quizzes': 'Volver a los quizzes',
    'quiz.label': 'Quiz',
    'quiz.question_counter': 'Pregunta',
    'quiz.answer_correct': '¡Respuesta correcta!',
    'quiz.answer_wrong': '¡Cuidado!',
    'quiz.next_question': 'Siguiente pregunta',
    'quiz.view_results': 'Ver resultados',

    // Deepfake Tester
    'deepfake.title': 'Probador y Analizador de Deepfakes IA',
    'deepfake.subtitle':
      'Detecta voces clonadas, caras sintéticas y estafas generadas por inteligencia artificial.',
    'deepfake.tab_audio': 'Analizador de Audio y Notas de Voz',
    'deepfake.tab_video': 'Analizador Facial y de Video',
    'deepfake.tab_library': 'Casos Reales y Detección',
    'deepfake.verdict_fake': 'Alerta: Alta probabilidad de Deepfake sintético',
    'deepfake.verdict_legit': 'Indicadores coherentes: Contenido probablemente auténtico',
    'deepfake.analyze_btn': 'Iniciar análisis heurístico IA',

    // News Screen
    'news.title': 'Noticias y Vigilancia Ciber',
    'news.subtitle': 'Información actualizada en vivo sobre amenazas, alertas y hábitos seguros.',
    'news.live_badge': 'EN VIVO',
    'news.refresh_btn': 'Actualizar en vivo',
    'news.refreshing': 'Actualizando...',
    'news.urgent_alert': 'Alerta de Ciberamenaza',
    'news.scan_sms': 'Escanear SMS',
    'news.vigilance_title': 'Índice de Amenaza Regional',
    'news.vigilance_level': 'ALTO',
    'news.vigilance_desc':
      'Amenazas principales hoy: Phishing bancario, falsos repartidores y robo de sesiones.',
    'news.scanner_btn': 'Detector de Estafas IA',
    'news.breaking_alert_title':
      'Campaña activa de SMS bancarios y Mobile Money falsos detectada en África occidental',
    'news.breaking_alert_vector': 'SMS / Smishing',
    'news.breaking_alert_action': 'No introduzcas ningún código USSD ni compartas ningún PIN.',
    'news.breaking_alert_refresh_title':
      'Alerta urgente: invitaciones falsas de restablecimiento de WhatsApp en circulación',
    'news.breaking_alert_refresh_summary':
      'Los ciberdelincuentes están enviando SMS pidiendo un código de 6 dígitos para “proteger” tu cuenta de WhatsApp.',
    'news.refresh_minutes_ago': 'Hace {{minutes}} min',
    'news.just_now': 'Ahora mismo',
    'news.all': 'Todas',
    'news.threats': 'Amenazas',
    'news.tips': 'Consejos',
    'news.events': 'Eventos',

    // Profile Screen
    'profile.tab_profile': 'Mi Perfil',
    'profile.tab_register': 'Registro / Iniciar sesión',
    'profile.tab_badges': 'Insignias',
    'profile.tab_certs': 'Certificados',
    'profile.certified_account': 'Cuenta Verificada',
    'profile.level_prefix': 'Nivel',
    'profile.xp_suffix': 'Puntos de experiencia',
    'profile.settings_btn': 'Ajustes',
    'profile.stat_progression': 'Progreso',
    'profile.stat_badges': 'Insignias',
    'profile.stat_certs': 'Certificados',
    'profile.link_courses': 'Mis cursos e-learning',
    'profile.link_quizzes': 'Mis cuestionarios',
    'profile.link_badges': 'Mis insignias de progreso',
    'profile.link_certs': 'Mis certificados oficiales',
    'profile.link_favorites': 'Mis favoritos',
    'profile.link_help': 'Ayuda y soporte CyberGuard IA',
    'profile.btn_logout': 'Cerrar sesión',
    'profile.btn_reset': 'Restablecer datos',
    'profile.badges_title': 'Insignias Dinámicas de Progreso',
    'profile.badges_subtitle': 'Desbloquea insignias aprobando cuestionarios y cursos.',
    'profile.certs_title': 'Mis Certificados Oficiales CyberSens',
    'profile.certs_subtitle':
      'Diplomas con identificador único bajo la supervisión del Director Académico VDPHACKER.',
    'profile.no_certs': 'Sin certificados todavía',
    'profile.no_certs_desc':
      'Completa un curso en la pestaña Aprender para obtener tu primer certificado oficial.',
    'profile.start_training': 'Comenzar un curso',
    'profile.view_print': 'Ver e Imprimir',
    'profile.guest_warning':
      'Estás en modo invitado. Inicia sesión para certificar tus resultados.',
    'profile.btn_connect': 'Iniciar sesión ahora',
    'profile.logout_success': '¡Sesión cerrada con éxito! Ahora estás en modo invitado.',
    'profile.avatar_change_title': 'Cambiar foto de perfil',
    'profile.avatar_save_btn': 'Guardar foto',
    'profile.avatar_saved_success': '¡Foto de perfil actualizada con éxito!',

    // Registration Form
    'auth.title_register': 'Registro de Estudiante CyberSens',
    'auth.title_login': 'Iniciar sesión en CyberSens',
    'auth.subtitle_register':
      'Crea tu perfil para certificar tus habilidades y guardar tus diplomas.',
    'auth.subtitle_login': 'Accede a tus cursos, insignias y certificaciones oficiales.',
    'auth.mode_register': 'Crear una cuenta',
    'auth.mode_login': 'Ya tengo una cuenta',
    'auth.fullname': 'Nombre completo (como aparecerá en tus certificados) *',
    'auth.email': 'Correo electrónico profesional o personal *',
    'auth.password': 'Contraseña segura (12+ caracteres recomendados) *',
    'auth.role': 'Tipo de usuario / Sector:',
    'auth.btn_register': 'Crear mi cuenta CyberSens',
    'auth.btn_login': 'Acceder a mi espacio',
    'auth.disclaimer':
      'Al registrarte, accedes gratuitamente a todas las formaciones y certificaciones oficiales de CyberSens.',

    // Common
    'common.back': 'Volver',
    'common.points': 'pts',
    'common.level': 'Nivel',
    'common.close': 'Cerrar',
    'common.save': 'Guardar ajustes',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.saved': '¡Modificaciones guardadas!',
    'common.search': 'Buscar',
    'common.all': 'Todos',
    'common.completed': 'Completado',
  },
};

const I18nContext = createContext<I18nContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === 'fr' || saved === 'en' || saved === 'es') {
        setUiLanguage(saved);
        return saved;
      }
      const prefsStr = localStorage.getItem('cybersens_user_preferences');
      if (prefsStr) {
        const parsed = JSON.parse(prefsStr);
        if (parsed.language === 'fr' || parsed.language === 'en' || parsed.language === 'es') {
          setUiLanguage(parsed.language);
          return parsed.language;
        }
      }
      const navLang = navigator.language?.slice(0, 2);
      if (navLang === 'en' || navLang === 'es') {
        setUiLanguage(navLang);
        return navLang;
      }
    } catch (e) {}
    setUiLanguage('fr');
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setUiLanguage(lang);
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      document.documentElement.lang = lang;

      // Also update in cybersens_user_preferences
      const prefsStr = localStorage.getItem('cybersens_user_preferences');
      if (prefsStr) {
        const parsed = JSON.parse(prefsStr);
        parsed.language = lang;
        localStorage.setItem('cybersens_user_preferences', JSON.stringify(parsed));
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('cybersens-prefs-changed'));
    window.dispatchEvent(
      new CustomEvent('cyber-notify', {
        detail: {
          message:
            lang === 'en'
              ? 'Language changed to English 🇬🇧'
              : lang === 'es'
                ? 'Idioma cambiado a Español 🇪🇸'
                : 'Langue changée en Français 🇫🇷',
          type: 'info',
        },
      }),
    );
  };

  useEffect(() => {
    setUiLanguage(language);
    document.documentElement.lang = language;
    document.title =
      language === 'en'
        ? 'CyberSens - Educate • Protect • Act'
        : language === 'es'
          ? 'CyberSens - Concienciar • Proteger • Actuar'
          : 'CyberSens - Sensibiliser • Protéger • Agir';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content =
        language === 'en'
          ? 'Cybersecurity awareness platform: courses, quizzes, certificates, labs and AI assistant.'
          : language === 'es'
            ? 'Plataforma de concienciación en ciberseguridad: cursos, cuestionarios, certificados, laboratorios y asistente IA.'
            : 'Plateforme de sensibilisation à la cybersécurité : formations, quiz, certificats, laboratoires et assistant IA.';
    }
  }, [language]);

  // Listen to external prefs change
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_LANG_KEY);
        if (saved && saved !== language && (saved === 'fr' || saved === 'en' || saved === 'es')) {
          setUiLanguage(saved);
          setLanguageState(saved);
        }
      } catch (e) {}
    };
    window.addEventListener('cybersens-prefs-changed', handleSync);
    return () => window.removeEventListener('cybersens-prefs-changed', handleSync);
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to French
    if (translations.fr && translations.fr[key]) {
      return translations.fr[key];
    }
    return fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const langOptions: { id: Language; label: string; flag: string; short: string }[] = [
    { id: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
    { id: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
    { id: 'es', label: 'Español', flag: '🇪🇸', short: 'ES' },
  ];

  const current = langOptions.find((o) => o.id === language) || langOptions[0];

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-500/40 transition-all active:scale-95"
        title="Changer de langue / Change language / Cambiar idioma"
        aria-label="Language selector"
      >
        <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span className="hidden sm:inline text-sm leading-none">{current.flag}</span>
        <span className="hidden sm:inline font-mono text-[11px]">{current.short}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {langOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setLanguage(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  language === opt.id
                    ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{opt.flag}</span>
                  <span>{opt.label}</span>
                </div>
                {language === opt.id && (
                  <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
