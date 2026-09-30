import type {
  CourseModule,
  Language,
  NewsArticle,
  BestPracticeItem,
  PracticalExercise,
} from '../types';
import { COMPREHENSIVE_COURSE_MODULES } from './coursesData.ts';
import { ADVANCED_COURSE_MODULES } from './advancedCoursesData.ts';
import { COURSE_TRANSLATIONS_EN } from './courseTranslations.en.ts';
import { COURSE_TRANSLATIONS_ES } from './courseTranslations.es.ts';
import { COURSE_EXERCISES_FR } from './courseExercises.fr.ts';

// Le nombre de leçons et la durée totale sont déduits des leçons pour rester toujours cohérents
export const COURSE_MODULES: CourseModule[] = [
  ...COMPREHENSIVE_COURSE_MODULES,
  ...ADVANCED_COURSE_MODULES,
].map((module) => ({
  ...module,
  lessonsCount: module.lessons.length,
  duration: `${module.lessons.reduce((total, lesson) => total + (parseInt(lesson.duration, 10) || 0), 0)} min`,
}));

const localizedModules: Record<Exclude<Language, 'fr'>, CourseModule[]> = {
  en: COURSE_TRANSLATIONS_EN,
  es: COURSE_TRANSLATIONS_ES,
};

const exerciseByLanguage: Record<Language, Record<string, PracticalExercise>> = {
  fr: COURSE_EXERCISES_FR,
  en: Object.fromEntries(
    COURSE_TRANSLATIONS_EN.flatMap((module) =>
      module.lessons.flatMap((lesson) =>
        lesson.practicalExercise ? [[lesson.id, lesson.practicalExercise]] : [],
      ),
    ),
  ),
  es: Object.fromEntries(
    COURSE_TRANSLATIONS_ES.flatMap((module) =>
      module.lessons.flatMap((lesson) =>
        lesson.practicalExercise ? [[lesson.id, lesson.practicalExercise]] : [],
      ),
    ),
  ),
};

const localizedCourseCache = new Map<Language, CourseModule[]>();

export const getCourseModules = (language: Language): CourseModule[] => {
  const cached = localizedCourseCache.get(language);
  if (cached) return cached;

  const source = language === 'fr' ? COURSE_MODULES : localizedModules[language];
  const canonicalById = new Map(COURSE_MODULES.map((module) => [module.id, module]));
  const courses = source.map((module) => ({
    ...canonicalById.get(module.id),
    ...module,
    lessonsCount: canonicalById.get(module.id)?.lessonsCount ?? module.lessons.length,
    duration: canonicalById.get(module.id)?.duration ?? module.duration,
    lessons: module.lessons.map((lesson) => ({
      ...lesson,
      practicalExercise: exerciseByLanguage[language][lesson.id],
    })),
  }));
  localizedCourseCache.set(language, courses);
  return courses;
};

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

export const NEWS_ARTICLE_TRANSLATIONS: Record<
  Language,
  Partial<
    Record<
      NewsArticle['id'],
      Partial<
        Pick<
          NewsArticle,
          | 'title'
          | 'category'
          | 'timeAgo'
          | 'readTime'
          | 'author'
          | 'tag'
          | 'summary'
          | 'content'
          | 'keyPoints'
        >
      >
    >
  >
> = {
  fr: {},
  en: {
    'article-1': {
      title: 'How to spot an online scam?',
      category: 'Tips',
      summary:
        'Online scams are becoming increasingly sophisticated. Here are the signs that should immediately raise your alert level.',
      content: [
        'Cybercriminals often exploit trust, fear, or the lure of quick gain to push targets into revealing sensitive information or sending money.',
        'Among the most common techniques are fake tech support, bogus crypto investment opportunities, and false parcel-delivery scams.',
        'Always take a step back: an extreme time pressure message (“Act now within 15 minutes!”) is a classic red flag for fraud.',
      ],
      keyPoints: [
        'Always verify the sender and their domain',
        'Beware of offers that seem too good to be true',
        'Never share sensitive information or 2FA codes',
        'Use a secure connection (https:// with a lock icon)',
        'Report any suspicious content to the relevant platform',
      ],
      readTime: '5 min read',
      author: 'CyberSens',
      tag: '#Awareness',
    },
    'article-2': {
      title: 'Increase in social media scams in Africa',
      category: 'Threats',
      summary:
        'A spike in attacks targeting Mobile Money accounts and social-engineering scams on WhatsApp and Telegram.',
      content: [
        'Regional cyber observatories report a surge in messages pretending to offer government aid or instant lottery winnings.',
        'Attackers push victims to dial malicious USSD codes that automatically transfer funds or hijack access to the SIM card.',
      ],
      keyPoints: [
        'Never dial a USSD code sent by an unknown person',
        'Protect your Mobile Money secret PIN: no agent will ever ask for it',
        'Enable the SIM security PIN to reduce account takeover risks',
      ],
      readTime: '4 min read',
      author: 'CyberSens Intelligence Team',
      tag: '#Africa #MobileMoney',
    },
    'article-3': {
      title: '5 tips to secure your smartphone',
      category: 'Tips',
      summary:
        'Your phone holds most of your digital life. Use these 5 rules to reinforce its defenses.',
      content: [
        'From biometric unlocking to built-in hardware encryption, modern smartphones include powerful security features that are often underused.',
        'Also think about enabling remote location and wipe features in case the phone is lost or stolen.',
      ],
      keyPoints: [
        'Always lock with a strong pattern, 6-digit code, or fingerprint',
        'Disable Bluetooth and Wi‑Fi when not in use',
        'Enable encrypted backups for your photos and documents',
        'Install only verified apps',
      ],
      readTime: '3 min read',
      author: 'CyberSens Lab',
      tag: '#Smartphones #GoodPractices',
    },
    'article-4': {
      title: 'A new phishing threat detected',
      category: 'Threats',
      summary:
        'Large-scale campaign using forged tax and postal service emails with deceptive lookalike domains.',
      content: [
        'Attackers use homoglyph techniques to replace characters such as “o” with “0” or Cyrillic lookalikes to fool distracted users.',
        'The links lead to nearly identical forms designed to steal bank card numbers.',
      ],
      keyPoints: [
        'Inspect the domain letter by letter',
        'Never validate an unexpected banking request within an app',
        'Access official services using your usual bookmarks',
      ],
      readTime: '4 min read',
      author: 'CyberGuard Threat Intelligence',
      tag: '#Phishing #Alert',
    },
    'article-5': {
      title: 'Global cybersecurity day: why it matters',
      category: 'Events',
      summary:
        'A worldwide mobilization to build a shared culture of cybersecurity and protect younger generations online.',
      content: [
        'Cybersecurity has become a civic issue of the first order. With the spread of generative AI and deepfakes, awareness remains our strongest defense.',
        'CyberSens is committed every day to making these fundamental skills accessible to all.',
      ],
      keyPoints: [
        'Digital education must begin at an early age',
        'Share good practices with family and coworkers',
        'Stay curious and informed about new threats',
      ],
      readTime: '6 min read',
      author: 'CyberSens Events',
      tag: '#Awareness #Community',
    },
    'article-6': {
      title: 'The 10 most common online mistakes',
      category: 'Tips',
      summary:
        '10 small everyday habits that open the door to cybercriminals and how to correct them.',
      content: [
        '1. Reusing the same password everywhere.',
        '2. Clicking links in spam to “unsubscribe.”',
        '3. Logging onto airport or café Wi‑Fi without precautions.',
        '4. Leaving a session open on a shared computer.',
        '5. Ignoring browser security warnings.',
      ],
      keyPoints: [
        'Eliminate repeated risky behaviors',
        'Create automatic verification reflexes',
        'Adopt a password manager without waiting',
      ],
      readTime: '5 min • Beginner',
      author: 'CyberSens',
      tag: '#Recommended #Beginner',
    },
  },
  es: {
    'article-1': {
      title: '¿Cómo detectar un fraude en línea?',
      category: 'Consejos',
      summary:
        'Los fraudes en línea se vuelven cada vez más sofisticados. Aquí están las señales que deben alertarte de inmediato.',
      content: [
        'Los ciberdelincuentes suelen explotar la confianza, el miedo o el atractivo de una ganancia rápida para empujar a sus víctimas a revelar datos sensibles o transferir dinero.',
        'Entre las técnicas más comunes están la falsa asistencia técnica, las falsas oportunidades de inversión en criptomonedas y los fraudes con paquetes.',
        'Tómate siempre un momento para reflexionar: un mensaje con presión extrema (“Actúa en 15 minutos”) es una marca de agua característica de los engaños.',
      ],
      keyPoints: [
        'Verifica siempre al remitente y su dominio',
        'Desconfía de ofertas demasiado buenas para ser verdad',
        'Nunca compartas información sensible ni códigos 2FA',
        'Usa una conexión segura (https:// con candado)',
        'Denuncia cualquier contenido sospechoso a la plataforma adecuada',
      ],
      readTime: '5 min de lectura',
      author: 'CyberSens',
      tag: '#Concienciación',
    },
    'article-2': {
      title: 'Aumento de fraudes en redes sociales en África',
      category: 'Amenazas',
      summary:
        'Crecimiento de ataques dirigidos a cuentas de Mobile Money y estafas de ingeniería social en WhatsApp y Telegram.',
      content: [
        'Los observatorios regionales de ciberseguridad reportan una subida de mensajes que ofrecen ayudas gubernamentales o premios de lotería instantánea.',
        'Los atacantes empujan a las víctimas a marcar códigos USSD maliciosos que transfieren dinero o roban el control de la tarjeta SIM.',
      ],
      keyPoints: [
        'Nunca marques ningún código USSD enviado por un desconocido',
        'Protege tu PIN secreto de Mobile Money: ningún agente te lo pedirá',
        'Activa el PIN de seguridad de la tarjeta SIM para reducir el robo de cuentas',
      ],
      readTime: '4 min de lectura',
      author: 'Equipo de inteligencia CyberSens',
      tag: '#África #MobileMoney',
    },
    'article-3': {
      title: '5 consejos para proteger tu smartphone',
      category: 'Consejos',
      summary:
        'Tu teléfono guarda gran parte de tu vida digital. Aplica estas 5 reglas para reforzar su seguridad.',
      content: [
        'Desde el desbloqueo biométrico hasta el cifrado de hardware nativo, los smartphones modernos disponen de funciones avanzadas que muchas veces se subutilizan.',
        'También es importante activar la localización y el borrado remoto por si se pierde o te lo roban.',
      ],
      keyPoints: [
        'Bloquea siempre con un patrón complejo, código de 6 dígitos o huella',
        'Desactiva Bluetooth y Wi‑Fi cuando no los uses',
        'Activa copias de seguridad cifradas de fotos y documentos',
        'Instala únicamente aplicaciones verificadas',
      ],
      readTime: '3 min de lectura',
      author: 'CyberSens Lab',
      tag: '#Smartphones #BuenasPrácticas',
    },
    'article-4': {
      title: 'Se detecta una nueva amenaza de phishing',
      category: 'Amenazas',
      summary:
        'Una campaña masiva de correos que imitan servicios fiscales y postales con dominios engañosos.',
      content: [
        'Los ciberdelincuentes usan técnicas de homógrafos para reemplazar letras con caracteres parecidos y engañar a usuarios distraídos.',
        'Los enlaces llevan a formularios clones diseñados para robar números de tarjetas bancarias.',
      ],
      keyPoints: [
        'Inspecciona el nombre de dominio letra por letra',
        'Nunca valides una transacción bancaria inesperada desde la aplicación',
        'Accede a tus servicios oficiales usando tus favoritos habituales',
      ],
      readTime: '4 min de lectura',
      author: 'Inteligencia de amenazas CyberGuard',
      tag: '#Phishing #Alerta',
    },
    'article-5': {
      title: 'Día mundial de la ciberseguridad: los retos',
      category: 'Eventos',
      summary:
        'Movilización internacional para una cultura compartida de seguridad y protección de las generaciones jóvenes online.',
      content: [
        'La ciberseguridad se ha convertido en un tema ciudadano clave. Frente a la democratización de la IA generativa y los deepfakes, la sensibilización sigue siendo nuestra mejor defensa.',
        'CyberSens trabaja cada día para democratizar estos conocimientos fundamentales entre toda la comunidad.',
      ],
      keyPoints: [
        'La educación digital debe comenzar desde la infancia',
        'Comparte las buenas prácticas con tu entorno',
        'Mantente curioso y informado sobre nuevas amenazas',
      ],
      readTime: '6 min de lectura',
      author: 'CyberSens Eventos',
      tag: '#Concienciación #Comunidad',
    },
    'article-6': {
      title: 'Los 10 errores más comunes en línea',
      category: 'Consejos',
      summary:
        '10 hábitos cotidianos que sirven de puerta de entrada a los ciberdelincuentes y cómo corregirlos.',
      content: [
        '1. Reutilizar la misma contraseña en todos los servicios.',
        '2. Hacer clic en enlaces de spam para “darse de baja”.',
        '3. Conectarse al Wi‑Fi de un aeropuerto o café sin precauciones.',
        '4. Dejar la sesión abierta en un equipo compartido.',
        '5. Ignorar las advertencias de seguridad del navegador.',
      ],
      keyPoints: [
        'Elimina comportamientos arriesgados repetidos',
        'Crea reflejos automáticos de verificación',
        'Adopta un gestor de contraseñas sin esperar',
      ],
      readTime: '5 min • Principiante',
      author: 'CyberSens',
      tag: '#Recomendado #Principiante',
    },
  },
};

export const getLocalizedNewsArticles = (language: Language): NewsArticle[] =>
  NEWS_ARTICLES.map((article) => {
    const localized = NEWS_ARTICLE_TRANSLATIONS[language][article.id] ?? {};

    return {
      ...article,
      ...localized,
      category: localized.category ?? article.category,
      readTime: localized.readTime ?? article.readTime,
      timeAgo: localized.timeAgo ?? article.timeAgo,
      author: localized.author ?? article.author,
      tag: localized.tag ?? article.tag,
      summary: localized.summary ?? article.summary,
      content: localized.content ?? article.content,
      keyPoints: localized.keyPoints ?? article.keyPoints,
      title: localized.title ?? article.title,
    };
  });

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
