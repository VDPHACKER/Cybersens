import { CourseModule, NewsArticle, BestPracticeItem } from '../types';
import { COMPREHENSIVE_COURSE_MODULES } from './coursesData';
import { ADVANCED_COURSE_MODULES } from './advancedCoursesData';

// Le nombre de leçons et la durée totale sont déduits des leçons pour rester toujours cohérents
export const COURSE_MODULES: CourseModule[] = [
  ...COMPREHENSIVE_COURSE_MODULES,
  ...ADVANCED_COURSE_MODULES,
].map((module) => ({
  ...module,
  lessonsCount: module.lessons.length,
  duration: `${module.lessons.reduce((total, lesson) => total + (parseInt(lesson.duration, 10) || 0), 0)} min`,
}));

export const BEST_PRACTICES: BestPracticeItem[] = [
  {
    id: 'bp-1',
    title: 'Utilise des mots de passe forts',
    subtitle: 'Au moins 12 caractères avec chiffres et symboles.',
    icon: 'Key',
    color: 'from-amber-500 to-orange-500',
    details:
      'Un mot de passe long et complexe est votre première ligne de défense contre les attaques automatisées par dictionnaire.',
    checklist: [
      'Minimum 12 à 16 caractères',
      'Mélange majuscules, minuscules, chiffres et caractères spéciaux',
      'Un mot de passe distinct par service critique',
      'Utilisation d’un gestionnaire de mots de passe réputé',
    ],
  },
  {
    id: 'bp-2',
    title: 'Active la double authentification (2FA)',
    subtitle: 'Une couche de sécurité essentielle en plus.',
    icon: 'ShieldCheck',
    color: 'from-emerald-500 to-teal-600',
    details:
      'Même si un cybercriminel intercepte votre mot de passe, il ne pourra pas se connecter sans votre code temporaire.',
    checklist: [
      'Activer sur vos e-mails, banques et réseaux sociaux',
      'Privilégier les applications d’authentification (Google Authenticator, Aegis) plutôt que les SMS',
      'Sauvegarder les codes de secours d’urgence en lieu sûr',
    ],
  },
  {
    id: 'bp-3',
    title: 'Mets à jour tes appareils',
    subtitle: 'Pour corriger les failles de sécurité connues.',
    icon: 'RefreshCw',
    color: 'from-blue-500 to-indigo-600',
    details:
      'Les fabricants publient régulièrement des correctifs pour bloquer les vulnérabilités exploitées par les pirates.',
    checklist: [
      'Activer les mises à jour automatiques du système (Android, iOS, Windows, macOS)',
      'Mettre à jour régulièrement les navigateurs web et applications',
      'Redémarrer vos appareils au moins une fois par semaine',
    ],
  },
  {
    id: 'bp-4',
    title: 'Fais attention aux liens suspects',
    subtitle: 'Ne clique pas sur des liens non sollicités.',
    icon: 'Link2',
    color: 'from-rose-500 to-red-600',
    details:
      'Les messages alarmistes par SMS ou WhatsApp dissimulent fréquemment des sites clones destinés à dérober vos identifiants.',
    checklist: [
      'Examiner attentivement l’URL avant toute action',
      'Ne pas ouvrir les pièces jointes inattendues (.zip, .exe, .scr)',
      'Vérifier l’information à la source sans passer par le lien du message',
    ],
  },
  {
    id: 'bp-5',
    title: 'Protège tes données personnelles',
    subtitle: 'Ne partage que l’essentiel sur le web.',
    icon: 'UserCheck',
    color: 'from-purple-500 to-pink-600',
    details:
      'Moins vous exposez de détails intimes en ligne (adresse, numéro de compte, école des enfants), moins vous êtes vulnérable à l’ingénierie sociale.',
    checklist: [
      'Limiter la visibilité des publications aux amis proches',
      'Ne jamais partager sa pièce d’identité sans filigrane protecteur',
      'Supprimer les comptes et applications inactifs',
    ],
  },
  {
    id: 'bp-6',
    title: 'Utilise un antivirus fiable',
    subtitle: 'Pour te protéger des logiciels malveillants.',
    icon: 'ShieldAlert',
    color: 'from-cyan-500 to-blue-600',
    details:
      'Une solution de sécurité active détecte les fichiers corrompus et bloque les connexions réseau douteuses en temps réel.',
    checklist: [
      'Maintenir la base virale à jour quotidiennement',
      'Effectuer une analyse complète du système chaque mois',
      'Ne pas désactiver l’antivirus pour installer un programme non certifié',
    ],
  },
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'article-1',
    title: 'Comment repérer une arnaque en ligne ?',
    category: 'Conseils',
    timeAgo: 'Il y a 30 min',
    readTime: '5 min de lecture',
    author: 'CyberSens',
    tag: '#Sensibilisation',
    image:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    summary:
      'Les arnaques en ligne sont de plus en plus sophistiquées. Voici les signes qui doivent impérativement vous alerter.',
    content: [
      'Les cybercriminels exploitent souvent la confiance, la peur ou l’appât du gain pour inciter leurs cibles à divulguer des données confidentielles ou à verser des fonds.',
      'Parmi les techniques les plus répandues : le faux support technique (Tech Scam), les fausses opportunités d’investissement en cryptomonnaies et les fraudes aux faux avis de livraison de colis.',
      'Prenez toujours un temps de recul : une pression temporelle extrême ("Attention, action requise sous 15 minutes !") est la marque de fabrique des escroqueries.',
    ],
    keyPoints: [
      'Vérifiez toujours l’expéditeur réel et son domaine',
      'Méfiez-vous des offres trop belles pour être vraies',
      'Ne partagez jamais vos informations sensibles ou codes 2FA',
      'Utilisez une connexion sécurisée (https:// avec cadenas)',
      'Signalez tout contenu suspect aux plateformes compétentes',
    ],
  },
  {
    id: 'article-2',
    title: 'Hausse des arnaques sur les réseaux sociaux en Afrique',
    category: 'Menaces',
    timeAgo: 'Il y a 2 heures',
    readTime: '4 min de lecture',
    author: 'Équipe Veille CyberSens',
    tag: '#Afrique #MobileMoney',
    image:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    summary:
      'Multiplication des attaques ciblant les comptes Mobile Money et l’ingénierie sociale sur WhatsApp et Telegram.',
    content: [
      'Les observatoires régionaux de cybersécurité signalent une recrudescence de messages prétendant offrir des aides gouvernementales ou des gains de loterie instantanés.',
      'Les attaquants incitent les victimes à composer des codes USSD malveillants qui transfèrent automatiquement les soldes bancaires ou transfèrent le contrôle du numéro SIM (SIM Swapping).',
    ],
    keyPoints: [
      'Ne composez aucun code USSD transmis par un inconnu',
      'Protégez votre code secret Mobile Money : aucun agent ne vous le demandera',
      'Activez le code PIN de sécurité sur votre carte SIM physique',
    ],
  },
  {
    id: 'article-3',
    title: '5 conseils pour sécuriser votre smartphone',
    category: 'Conseils',
    timeAgo: 'Il y a 1 jour',
    readTime: '3 min de lecture',
    author: 'CyberSens Lab',
    tag: '#Smartphones #BonnesPratiques',
    image:
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80',
    summary:
      'Votre téléphone contient toute votre vie numérique. Adoptez ces 5 règles pour le barricader efficacement.',
    content: [
      'Du déverrouillage biométrique au chiffrement matériel natif, les smartphones modernes disposent d’excellentes fonctionnalités de sécurité souvent sous-utilisées.',
      'Pensez également à activer la fonction de localisation et effacement à distance en cas de vol ou de perte.',
    ],
    keyPoints: [
      'Verrouillez toujours par schéma complexe, code 6 chiffres ou empreinte',
      'Désactivez le Bluetooth et le Wi-Fi lorsque vous n’en avez pas l’usage',
      'Activez la sauvegarde chiffrée de vos photos et documents',
      'Installez uniquement des applications vérifiées',
    ],
  },
  {
    id: 'article-4',
    title: 'Une nouvelle menace de phishing détectée',
    category: 'Menaces',
    timeAgo: 'Il y a 2 jours',
    readTime: '4 min de lecture',
    author: 'CyberGuard Threat Intelligence',
    tag: '#Phishing #Alerte',
    image:
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
    summary:
      'Campagne massive d’e-mails imitant les services fiscaux et postaux avec des domaines typographiques trompeurs.',
    content: [
      'Des cyberattaquants utilisent des techniques d’homoglyphes (remplacer la lettre "o" par le chiffre "0" ou une lettre cyrillique similaire) pour tromper l’œil de l’utilisateur distrait.',
      'Les liens dirigent vers des formulaires parfaitement clonés dérobant les numéros de carte bancaire.',
    ],
    keyPoints: [
      'Inspectez le nom de domaine lettre par lettre',
      'Ne validez jamais une transaction bancaire imprévue sur votre application',
      'Consultez vos espaces officiels via vos favoris habituels',
    ],
  },
  {
    id: 'article-5',
    title: 'Journée mondiale de la cybersécurité : les enjeux',
    category: 'Événements',
    timeAgo: 'Il y a 3 jours',
    readTime: '6 min de lecture',
    author: 'CyberSens Événement',
    tag: '#Sensibilisation #Communauté',
    image:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    summary:
      'Mobilisation internationale pour une culture de la sécurité partagée et la protection des jeunes générations en ligne.',
    content: [
      'La cybersécurité est devenue un enjeu citoyen majeur. Face à la démocratisation de l’intelligence artificielle générative et des deepfakes, la sensibilisation est notre meilleur rempart.',
      'CyberSens s’engage au quotidien pour démocratiser ces savoirs fondamentaux auprès de toutes et tous.',
    ],
    keyPoints: [
      'L’éducation numérique doit débuter dès le plus jeune âge',
      'Partagez les bonnes pratiques avec votre entourage et vos collègues',
      'Restez curieux et informez-vous continuellement sur les nouvelles menaces',
    ],
  },
  {
    id: 'article-6',
    title: 'Les 10 erreurs courantes en ligne',
    category: 'Conseils',
    timeAgo: 'Il y a 4 jours',
    readTime: '5 min • Débutant',
    author: 'CyberSens',
    tag: '#Recommandé #Débutant',
    image:
      'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800&auto=format&fit=crop&q=80',
    summary:
      '10 habitudes anodines du quotidien qui ouvrent la porte aux pirates informatiques, et comment les corriger.',
    content: [
      '1. Réutiliser le même mot de passe partout.',
      '2. Cliquer sur les liens dans les spams pour "se désinscrire".',
      '3. Se connecter sur le Wi-Fi d’un aéroport ou d’un café sans précaution.',
      '4. Laisser sa session ouverte sur un ordinateur partagé.',
      '5. Ignorer les avertissements de sécurité du navigateur.',
    ],
    keyPoints: [
      'Bannir les comportements à risque répétés',
      'Créer des réflexes automatiques de vérification',
      'Adopter un gestionnaire de mots de passe sans attendre',
    ],
  },
];
