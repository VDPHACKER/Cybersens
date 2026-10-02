// Contenu du Guide d'utilisation : données pures (aucun JSX) pour pouvoir être testées sans navigateur.

export interface Tr {
  fr: string;
  en: string;
  es: string;
}

export interface GuideSection {
  id: string;
  title: Tr;
  summary: Tr;
  steps: Tr[];
  tips?: Tr[];
}

export const QUICK_START: Tr[] = [
  {
    fr: 'Créez votre compte (ou connectez-vous) : c’est gratuit et cela sauvegarde votre progression.',
    en: 'Create your account (or sign in): it is free and saves your progress.',
    es: 'Cree su cuenta (o inicie sesión): es gratis y guarda su progreso.',
  },
  {
    fr: 'Ouvrez « Formations » et suivez un premier module, leçon après leçon.',
    en: 'Open “Courses” and follow a first module, lesson by lesson.',
    es: 'Abra «Formaciones» y siga un primer módulo, lección a lección.',
  },
  {
    fr: 'Testez vos connaissances avec un Quiz, seul ou en salle avec des amis.',
    en: 'Test your knowledge with a Quiz, alone or in a room with friends.',
    es: 'Ponga a prueba sus conocimientos con un Quiz, solo o en sala con amigos.',
  },
  {
    fr: 'Passez à la pratique : un défi de l’Arène CTF ou un mini-jeu.',
    en: 'Move on to practice: a CTF Arena challenge or a mini-game.',
    es: 'Pase a la práctica: un reto de la Arena CTF o un minijuego.',
  },
  {
    fr: 'Une question ? Demandez à l’Assistant IA, ou revenez sur ce guide.',
    en: 'A question? Ask the AI assistant, or come back to this guide.',
    es: '¿Una pregunta? Pregunte al Asistente IA o vuelva a esta guía.',
  },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'home',
    title: { fr: 'Tableau de bord', en: 'Dashboard', es: 'Panel' },
    summary: {
      fr: 'Votre point de départ : progression, accès rapides et prochaines actions conseillées.',
      en: 'Your starting point: progress, shortcuts and suggested next actions.',
      es: 'Su punto de partida: progreso, accesos rápidos y próximas acciones sugeridas.',
    },
    steps: [
      {
        fr: 'Cliquez sur « Tableau de bord » dans le menu (ou sur « Accueil » en bas sur mobile).',
        en: 'Click “Dashboard” in the menu (or “Home” at the bottom on mobile).',
        es: 'Pulse «Panel» en el menú (o «Inicio» abajo en el móvil).',
      },
      {
        fr: 'Utilisez les cartes pour aller directement vers une fonctionnalité.',
        en: 'Use the cards to jump straight to a feature.',
        es: 'Use las tarjetas para ir directamente a una función.',
      },
    ],
  },
  {
    id: 'learn',
    title: { fr: 'Formations', en: 'Courses', es: 'Formaciones' },
    summary: {
      fr: 'Des modules progressifs, du niveau débutant à avancé, avec un examen et un certificat à la clé.',
      en: 'Progressive modules from beginner to advanced, with an exam and a certificate at the end.',
      es: 'Módulos progresivos, de principiante a avanzado, con examen y certificado al final.',
    },
    steps: [
      {
        fr: 'Choisissez un module et ouvrez-le pour voir ses leçons.',
        en: 'Pick a module and open it to see its lessons.',
        es: 'Elija un módulo y ábralo para ver sus lecciones.',
      },
      {
        fr: 'Lisez chaque leçon jusqu’au bout et validez-la : votre avancée est enregistrée.',
        en: 'Read each lesson to the end and mark it done: your progress is saved.',
        es: 'Lea cada lección hasta el final y valídela: su avance se guarda.',
      },
      {
        fr: 'Une fois toutes les leçons terminées, passez l’examen final pour obtenir votre certificat.',
        en: 'Once all lessons are complete, take the final exam to earn your certificate.',
        es: 'Con todas las lecciones terminadas, haga el examen final para obtener su certificado.',
      },
    ],
    tips: [
      {
        fr: 'L’examen est corrigé par le serveur : le certificat est signé et vérifiable. Retrouvez-le dans « Mon profil ».',
        en: 'The exam is graded by the server: the certificate is signed and verifiable. Find it under “My profile”.',
        es: 'El examen lo corrige el servidor: el certificado está firmado y es verificable. Lo encontrará en «Mi perfil».',
      },
    ],
  },
  {
    id: 'quiz',
    title: {
      fr: 'Quiz solo et salles multijoueurs',
      en: 'Solo quiz and multiplayer rooms',
      es: 'Quiz solo y salas multijugador',
    },
    summary: {
      fr: 'Entraînez-vous seul, ou affrontez vos amis dans une salle partagée par code.',
      en: 'Practise alone, or play against friends in a room shared by code.',
      es: 'Practique solo o juegue contra amigos en una sala compartida por código.',
    },
    steps: [
      {
        fr: 'Solo : choisissez le nombre de questions et la difficulté, puis lancez le quiz.',
        en: 'Solo: choose the number of questions and the difficulty, then start the quiz.',
        es: 'Solo: elija el número de preguntas y la dificultad, y empiece el quiz.',
      },
      {
        fr: 'Salle : créez une salle pour obtenir un code à 6 chiffres, ou rejoignez-en une en saisissant ce code.',
        en: 'Room: create a room to get a 6-digit code, or join one by entering that code.',
        es: 'Sala: cree una sala para obtener un código de 6 dígitos, o únase a una introduciendo ese código.',
      },
      {
        fr: 'Chacun répond sur son propre appareil ; le classement s’affiche à la fin.',
        en: 'Everyone answers on their own device; the ranking appears at the end.',
        es: 'Cada uno responde en su propio dispositivo; la clasificación aparece al final.',
      },
    ],
    tips: [
      {
        fr: 'Un lien d’invitation (?join=code) ouvre directement la salle : partagez-le par message.',
        en: 'An invitation link (?join=code) opens the room directly: share it by message.',
        es: 'Un enlace de invitación (?join=código) abre la sala directamente: compártalo por mensaje.',
      },
    ],
  },
  {
    id: 'ctf',
    title: { fr: 'Arène CTF', en: 'CTF Arena', es: 'Arena CTF' },
    summary: {
      fr: 'Des défis de type « Capture The Flag » : trouvez un drapeau caché pour valider chaque épreuve.',
      en: 'Capture-The-Flag style challenges: find a hidden flag to validate each task.',
      es: 'Retos tipo «Capture The Flag»: encuentre una bandera oculta para validar cada prueba.',
    },
    steps: [
      {
        fr: 'Ouvrez un défi et lisez attentivement l’énoncé et les indices.',
        en: 'Open a challenge and read the statement and hints carefully.',
        es: 'Abra un reto y lea con atención el enunciado y las pistas.',
      },
      {
        fr: 'Trouvez le drapeau, saisissez-le dans le champ prévu, puis validez.',
        en: 'Find the flag, type it into the field, then submit.',
        es: 'Encuentre la bandera, escríbala en el campo previsto y valide.',
      },
      {
        fr: 'Bloqué ? Demandez un coup de pouce à l’Assistant IA depuis le défi.',
        en: 'Stuck? Ask the AI assistant for a nudge from the challenge.',
        es: '¿Atascado? Pida una pista al Asistente IA desde el reto.',
      },
    ],
    tips: [
      {
        fr: 'Les drapeaux sont générés aléatoirement : inutile de chercher une solution toute faite, il faut vraiment résoudre le défi.',
        en: 'Flags are randomly generated: there is no ready-made answer to look up, you have to actually solve the challenge.',
        es: 'Las banderas se generan al azar: no hay una solución ya hecha que buscar, hay que resolver el reto.',
      },
    ],
  },
  {
    id: 'games',
    title: { fr: 'Mini-jeux', en: 'Mini-games', es: 'Minijuegos' },
    summary: {
      fr: 'Apprendre en jouant : hameçonnage, pare-feu, chiffrement, menaces liées à l’IA, mémoire…',
      en: 'Learn by playing: phishing, firewalls, ciphers, AI threats, memory…',
      es: 'Aprender jugando: phishing, cortafuegos, cifrado, amenazas de IA, memoria…',
    },
    steps: [
      {
        fr: 'Choisissez un jeu dans la liste.',
        en: 'Pick a game from the list.',
        es: 'Elija un juego de la lista.',
      },
      {
        fr: 'Lisez la consigne affichée avant de commencer, puis jouez.',
        en: 'Read the instructions shown before you start, then play.',
        es: 'Lea las instrucciones antes de empezar y juegue.',
      },
      {
        fr: 'Votre score alimente vos points d’expérience.',
        en: 'Your score feeds your experience points.',
        es: 'Su puntuación suma a sus puntos de experiencia.',
      },
    ],
  },
  {
    id: 'tools',
    title: { fr: 'Outils de sécurité', en: 'Security tools', es: 'Herramientas de seguridad' },
    summary: {
      fr: 'Six outils concrets : testeur de deepfakes, audit de logs IA, liens douteux, e-mails de phishing, mots de passe, logs d’audit.',
      en: 'Six practical tools: deepfake tester, AI log audit, suspicious links, phishing emails, passwords, audit logs.',
      es: 'Seis herramientas prácticas: detector de deepfakes, auditoría IA, enlaces dudosos, correos de phishing, contraseñas, registros.',
    },
    steps: [
      {
        fr: 'Sélectionnez un outil avec les onglets en haut de la page.',
        en: 'Select a tool with the tabs at the top of the page.',
        es: 'Seleccione una herramienta con las pestañas de la parte superior.',
      },
      {
        fr: 'Collez le lien, le message ou le texte à analyser (ou saisissez un mot de passe d’essai), puis lancez l’analyse.',
        en: 'Paste the link, message or text to analyse (or type a test password), then run the analysis.',
        es: 'Pegue el enlace, mensaje o texto a analizar (o escriba una contraseña de prueba) y lance el análisis.',
      },
      {
        fr: 'Lisez le verdict et les explications : ils vous disent pourquoi un élément est jugé sûr ou suspect.',
        en: 'Read the verdict and explanations: they tell you why something is judged safe or suspicious.',
        es: 'Lea el veredicto y las explicaciones: le dicen por qué algo se considera seguro o sospechoso.',
      },
    ],
    tips: [
      {
        fr: 'Pour le testeur de mot de passe, n’utilisez jamais votre vrai mot de passe : saisissez-en un qui lui ressemble.',
        en: 'For the password tester, never type your real password: use one that looks like it.',
        es: 'En el medidor de contraseñas, no escriba nunca su contraseña real: use una parecida.',
      },
      {
        fr: 'Une analyse est une aide à la décision, pas une garantie : en cas de doute, ne cliquez pas.',
        en: 'An analysis is a decision aid, not a guarantee: when in doubt, do not click.',
        es: 'Un análisis ayuda a decidir, no es una garantía: ante la duda, no haga clic.',
      },
    ],
  },
  {
    id: 'ai',
    title: { fr: 'Assistant IA', en: 'AI assistant', es: 'Asistente IA' },
    summary: {
      fr: 'Un assistant spécialisé en cybersécurité pour expliquer une notion, analyser une situation ou vous guider dans un défi.',
      en: 'A cybersecurity-focused assistant to explain a concept, assess a situation or guide you through a challenge.',
      es: 'Un asistente especializado en ciberseguridad para explicar un concepto, analizar una situación o guiarle en un reto.',
    },
    steps: [
      {
        fr: 'Ouvrez « Assistant IA » et écrivez votre question en langage courant.',
        en: 'Open “AI assistant” and write your question in plain language.',
        es: 'Abra «Asistente IA» y escriba su pregunta en lenguaje normal.',
      },
      {
        fr: 'Posez des questions de suivi pour approfondir : la conversation garde le contexte.',
        en: 'Ask follow-up questions to go deeper: the conversation keeps its context.',
        es: 'Haga preguntas de seguimiento para profundizar: la conversación mantiene el contexto.',
      },
    ],
    tips: [
      {
        fr: 'Une IA peut se tromper : vérifiez les informations importantes. Ne lui transmettez jamais de mots de passe ni de données confidentielles.',
        en: 'An AI can be wrong: double-check important information. Never give it passwords or confidential data.',
        es: 'Una IA puede equivocarse: verifique la información importante. No le facilite nunca contraseñas ni datos confidenciales.',
      },
    ],
  },
  {
    id: 'news',
    title: { fr: 'Actualités', en: 'News', es: 'Noticias' },
    summary: {
      fr: 'L’actualité cyber en direct, issue de sites spécialisés.',
      en: 'Live cybersecurity news from specialist sites.',
      es: 'Noticias de ciberseguridad en directo de sitios especializados.',
    },
    steps: [
      {
        fr: 'Parcourez la liste et ouvrez un article pour le lire en détail.',
        en: 'Browse the list and open an article to read it in full.',
        es: 'Recorra la lista y abra un artículo para leerlo completo.',
      },
    ],
  },
  {
    id: 'leaderboard',
    title: { fr: 'Classements', en: 'Leaderboard', es: 'Clasificaciones' },
    summary: {
      fr: 'Comparez vos points d’expérience et votre niveau avec ceux des autres apprenants.',
      en: 'Compare your experience points and level with other learners.',
      es: 'Compare sus puntos de experiencia y su nivel con los de otros alumnos.',
    },
    steps: [
      {
        fr: 'Ouvrez « Classements » pour voir votre rang.',
        en: 'Open “Leaderboard” to see your rank.',
        es: 'Abra «Clasificaciones» para ver su posición.',
      },
      {
        fr: 'Gagnez des points avec les leçons, quiz, défis CTF et jeux.',
        en: 'Earn points with lessons, quizzes, CTF challenges and games.',
        es: 'Gane puntos con lecciones, quizzes, retos CTF y juegos.',
      },
    ],
    tips: [
      {
        fr: 'Votre vie privée est protégée : seuls votre prénom et l’initiale de votre nom sont visibles.',
        en: 'Your privacy is protected: only your first name and last initial are visible.',
        es: 'Su privacidad está protegida: solo se ven su nombre y la inicial de su apellido.',
      },
    ],
  },
  {
    id: 'community',
    title: { fr: 'Communauté', en: 'Community', es: 'Comunidad' },
    summary: {
      fr: 'Posez vos questions, partagez des astuces et signalez des alertes.',
      en: 'Ask questions, share tips and flag alerts.',
      es: 'Haga preguntas, comparta consejos y señale alertas.',
    },
    steps: [
      {
        fr: 'Lisez les publications existantes avant d’en créer une.',
        en: 'Read existing posts before creating one.',
        es: 'Lea las publicaciones existentes antes de crear una.',
      },
      {
        fr: 'Publiez votre message et répondez aux autres membres.',
        en: 'Publish your message and reply to other members.',
        es: 'Publique su mensaje y responda a otros miembros.',
      },
      {
        fr: 'Un contenu inapproprié ? Utilisez le signalement pour prévenir l’équipe de modération.',
        en: 'Inappropriate content? Use the report option to alert the moderators.',
        es: '¿Contenido inapropiado? Use la opción de denuncia para avisar a los moderadores.',
      },
    ],
  },
  {
    id: 'profile',
    title: {
      fr: 'Profil, certificats et préférences',
      en: 'Profile, certificates and settings',
      es: 'Perfil, certificados y preferencias',
    },
    summary: {
      fr: 'Votre espace personnel : informations, certificats obtenus, mot de passe et langue.',
      en: 'Your personal space: details, earned certificates, password and language.',
      es: 'Su espacio personal: datos, certificados obtenidos, contraseña e idioma.',
    },
    steps: [
      {
        fr: 'Ouvrez « Mon profil » (menu « Plus » sur mobile, ou menu de votre avatar).',
        en: 'Open “My profile” (“More” menu on mobile, or your avatar menu).',
        es: 'Abra «Mi perfil» (menú «Más» en el móvil, o el menú de su avatar).',
      },
      {
        fr: 'Consultez et téléchargez vos certificats, ou changez votre mot de passe.',
        en: 'View and download your certificates, or change your password.',
        es: 'Consulte y descargue sus certificados, o cambie su contraseña.',
      },
      {
        fr: 'Changez de langue (français, English, Español) depuis les préférences : toute l’application suit.',
        en: 'Switch language (français, English, Español) from the settings: the whole app follows.',
        es: 'Cambie de idioma (français, English, Español) desde las preferencias: toda la aplicación lo sigue.',
      },
    ],
  },
  {
    id: 'install',
    title: {
      fr: 'Installer l’application et mode hors ligne',
      en: 'Install the app and offline mode',
      es: 'Instalar la aplicación y modo sin conexión',
    },
    summary: {
      fr: 'CyberSens s’installe comme une vraie application, et fonctionne sans connexion pour les cours, quiz, jeux et le CTF.',
      en: 'CyberSens installs like a real app and works offline for courses, quizzes, games and the CTF.',
      es: 'CyberSens se instala como una aplicación real y funciona sin conexión para cursos, quizzes, juegos y el CTF.',
    },
    steps: [
      {
        fr: 'Android / ordinateur (Chrome, Edge) : cliquez sur le bouton « Installer » de l’en-tête, ou sur l’icône d’installation de la barre d’adresse.',
        en: 'Android / desktop (Chrome, Edge): click the “Install” button in the header, or the install icon in the address bar.',
        es: 'Android / ordenador (Chrome, Edge): pulse el botón «Instalar» de la cabecera o el icono de instalación de la barra de direcciones.',
      },
      {
        fr: 'iPhone / iPad (Safari) : touchez « Partager », puis « Sur l’écran d’accueil ».',
        en: 'iPhone / iPad (Safari): tap “Share”, then “Add to Home Screen”.',
        es: 'iPhone / iPad (Safari): toque «Compartir» y luego «Añadir a pantalla de inicio».',
      },
      {
        fr: 'Un indicateur vous prévient quand vous êtes hors ligne ; l’assistant IA, les actualités et la communauté demandent une connexion.',
        en: 'An indicator warns you when you are offline; the AI assistant, news and community need a connection.',
        es: 'Un indicador le avisa cuando está sin conexión; el asistente IA, las noticias y la comunidad necesitan conexión.',
      },
    ],
  },
];

export const TROUBLESHOOTING: { id: string; question: Tr; answer: Tr }[] = [
  {
    id: 'forgot-password',
    question: {
      fr: 'J’ai oublié mon mot de passe',
      en: 'I forgot my password',
      es: 'He olvidado mi contraseña',
    },
    answer: {
      fr: 'Sur l’écran de connexion, choisissez « Mot de passe oublié » et suivez le lien reçu par e-mail. Si l’envoi d’e-mails n’est pas activé, contactez l’administrateur. Un mot de passe doit faire au moins 12 caractères.',
      en: 'On the sign-in screen, choose “Forgot password” and follow the link sent by email. If email sending is not enabled, contact the administrator. A password must be at least 12 characters long.',
      es: 'En la pantalla de inicio de sesión, elija «Olvidé mi contraseña» y siga el enlace recibido por correo. Si el envío de correos no está activado, contacte con el administrador. La contraseña debe tener al menos 12 caracteres.',
    },
  },
  {
    id: 'progress-lost',
    question: {
      fr: 'Ma progression ne s’affiche pas',
      en: 'My progress is not showing',
      es: 'Mi progreso no aparece',
    },
    answer: {
      fr: 'Vérifiez que vous êtes bien connecté avec le même compte, puis actualisez la page. Si vous étiez hors ligne, la synchronisation se fait au retour de la connexion.',
      en: 'Check that you are signed in with the same account, then refresh the page. If you were offline, syncing happens when the connection returns.',
      es: 'Compruebe que ha iniciado sesión con la misma cuenta y actualice la página. Si estaba sin conexión, la sincronización se hace al volver la conexión.',
    },
  },
  {
    id: 'ai-unavailable',
    question: {
      fr: 'L’assistant IA ne répond pas',
      en: 'The AI assistant is not answering',
      es: 'El asistente IA no responde',
    },
    answer: {
      fr: 'Il nécessite une connexion Internet et peut être momentanément saturé. Patientez quelques instants et réessayez.',
      en: 'It needs an Internet connection and may be temporarily overloaded. Wait a moment and try again.',
      es: 'Necesita conexión a Internet y puede estar saturado temporalmente. Espere unos instantes e inténtelo de nuevo.',
    },
  },
  {
    id: 'update',
    question: {
      fr: 'Une mise à jour est proposée',
      en: 'An update is offered',
      es: 'Se ofrece una actualización',
    },
    answer: {
      fr: 'Acceptez-la quand le message apparaît : l’application se recharge avec la dernière version. Votre progression n’est pas perdue.',
      en: 'Accept it when the message appears: the app reloads with the latest version. Your progress is not lost.',
      es: 'Acéptela cuando aparezca el mensaje: la aplicación se recarga con la última versión. Su progreso no se pierde.',
    },
  },
  {
    id: 'room-code',
    question: {
      fr: 'Mon code de salle de quiz ne fonctionne pas',
      en: 'My quiz room code does not work',
      es: 'El código de mi sala de quiz no funciona',
    },
    answer: {
      fr: 'Le code comporte exactement 6 chiffres. Vérifiez-le auprès de la personne qui a créé la salle : une salle fermée ou terminée ne peut plus être rejointe.',
      en: 'The code is exactly 6 digits. Check it with the person who created the room: a closed or finished room can no longer be joined.',
      es: 'El código tiene exactamente 6 dígitos. Compruébelo con quien creó la sala: una sala cerrada o terminada ya no admite entradas.',
    },
  },
];
