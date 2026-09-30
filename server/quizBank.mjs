// Banque de questions du quiz multijoueur (français, anglais, espagnol).
// Les bonnes réponses restent sur le serveur : elles ne sont envoyées aux joueurs qu'à la révélation.

// Q(indexBonneRéponse, [fr, en, es], [[fr, en, es] × 4 réponses])
const Q = (answer, question, options) => ({ answer, question, options });

export const QUESTION_BANK = [
  Q(
    1,
    ['Que signifie « phishing » ?', 'What does “phishing” mean?', '¿Qué significa «phishing»?'],
    [
      [
        'Un virus qui chiffre les fichiers',
        'A virus that encrypts files',
        'Un virus que cifra archivos',
      ],
      [
        'Une fraude qui imite un organisme de confiance pour voler des informations',
        'A fraud that imitates a trusted organisation to steal information',
        'Un fraude que imita a una entidad de confianza para robar información',
      ],
      ['Un pare-feu matériel', 'A hardware firewall', 'Un cortafuegos físico'],
      ['Un logiciel de sauvegarde', 'Backup software', 'Un programa de copias de seguridad'],
    ],
  ),
  Q(
    2,
    [
      'Quel mot de passe est le plus robuste ?',
      'Which password is the strongest?',
      '¿Qué contraseña es la más robusta?',
    ],
    [
      ['Azerty123', 'Azerty123', 'Azerty123'],
      ['MonNom1990', 'MyName1990', 'MiNombre1990'],
      ['Cheval-Bleu-Nuage-Ardoise-58', 'Horse-Blue-Cloud-Slate-58', 'Caballo-Azul-Nube-Pizarra-58'],
      ['P@ssw0rd', 'P@ssw0rd', 'P@ssw0rd'],
    ],
  ),
  Q(
    0,
    [
      'À quoi sert l’authentification à deux facteurs (2FA) ?',
      'What is two-factor authentication (2FA) for?',
      '¿Para qué sirve la autenticación de dos factores (2FA)?',
    ],
    [
      [
        'À protéger un compte même si le mot de passe est volé',
        'To protect an account even if the password is stolen',
        'Para proteger una cuenta aunque la contraseña sea robada',
      ],
      ['À accélérer la connexion', 'To speed up sign-in', 'Para acelerar el inicio de sesión'],
      [
        'À remplacer le mot de passe par un code public',
        'To replace the password with a public code',
        'Para sustituir la contraseña por un código público',
      ],
      ['À supprimer les cookies', 'To delete cookies', 'Para borrar las cookies'],
    ],
  ),
  Q(
    3,
    [
      'Que faire si un SMS inattendu vous demande de payer des frais de livraison via un lien ?',
      'What should you do if an unexpected SMS asks you to pay delivery fees through a link?',
      '¿Qué hacer si un SMS inesperado le pide pagar gastos de envío mediante un enlace?',
    ],
    [
      [
        'Cliquer vite avant l’expiration',
        'Click quickly before it expires',
        'Hacer clic rápido antes de que caduque',
      ],
      [
        'Transférer le SMS à tous ses contacts',
        'Forward the SMS to all contacts',
        'Reenviar el SMS a todos los contactos',
      ],
      ['Répondre STOP', 'Reply STOP', 'Responder STOP'],
      [
        'Ne pas cliquer et vérifier sur le site officiel du transporteur',
        'Do not click and check on the carrier’s official website',
        'No hacer clic y comprobarlo en el sitio oficial del transportista',
      ],
    ],
  ),
  Q(
    1,
    ['Que fait un ransomware ?', 'What does ransomware do?', '¿Qué hace un ransomware?'],
    [
      ['Il espionne la webcam', 'It spies on the webcam', 'Espía la cámara web'],
      [
        'Il chiffre les données et réclame une rançon',
        'It encrypts data and demands a ransom',
        'Cifra los datos y exige un rescate',
      ],
      ['Il ralentit le Wi-Fi', 'It slows down Wi-Fi', 'Ralentiza el Wi-Fi'],
      ['Il supprime les e-mails', 'It deletes emails', 'Elimina los correos'],
    ],
  ),
  Q(
    2,
    [
      'Que signifie le cadenas « HTTPS » dans le navigateur ?',
      'What does the “HTTPS” padlock in the browser mean?',
      '¿Qué significa el candado «HTTPS» en el navegador?',
    ],
    [
      [
        'Que le site est forcément honnête',
        'That the site is necessarily honest',
        'Que el sitio es necesariamente honesto',
      ],
      ['Que le site est gratuit', 'That the site is free', 'Que el sitio es gratuito'],
      [
        'Que la connexion est chiffrée, pas que le site est digne de confiance',
        'That the connection is encrypted, not that the site is trustworthy',
        'Que la conexión está cifrada, no que el sitio sea de confianza',
      ],
      [
        'Que le site n’a pas de publicité',
        'That the site has no ads',
        'Que el sitio no tiene publicidad',
      ],
    ],
  ),
  Q(
    0,
    [
      'Quelle règle de sauvegarde est la plus recommandée ?',
      'Which backup rule is the most recommended?',
      '¿Qué regla de copia de seguridad es la más recomendada?',
    ],
    [
      [
        '3-2-1 : 3 copies, 2 supports, 1 hors site',
        '3-2-1: 3 copies, 2 media, 1 off-site',
        '3-2-1: 3 copias, 2 soportes, 1 fuera del sitio',
      ],
      [
        'Une seule copie sur le même disque',
        'A single copy on the same disk',
        'Una sola copia en el mismo disco',
      ],
      ['Sauvegarder une fois par an', 'Back up once a year', 'Hacer copia una vez al año'],
      ['Ne sauvegarder que les photos', 'Only back up photos', 'Copiar solo las fotos'],
    ],
  ),
  Q(
    3,
    [
      'Qu’est-ce que l’ingénierie sociale ?',
      'What is social engineering?',
      '¿Qué es la ingeniería social?',
    ],
    [
      [
        'Un outil de gestion de réseau',
        'A network management tool',
        'Una herramienta de gestión de red',
      ],
      ['Une méthode de chiffrement', 'An encryption method', 'Un método de cifrado'],
      [
        'Un réseau social professionnel',
        'A professional social network',
        'Una red social profesional',
      ],
      [
        'Manipuler des personnes pour obtenir un accès ou une information',
        'Manipulating people to obtain access or information',
        'Manipular personas para obtener acceso o información',
      ],
    ],
  ),
  Q(
    1,
    [
      'Pourquoi faire les mises à jour de sécurité rapidement ?',
      'Why install security updates quickly?',
      '¿Por qué instalar rápido las actualizaciones de seguridad?',
    ],
    [
      [
        'Pour changer l’apparence du système',
        'To change how the system looks',
        'Para cambiar el aspecto del sistema',
      ],
      [
        'Elles corrigent des failles que les attaquants exploitent',
        'They fix flaws that attackers exploit',
        'Corrigen fallos que los atacantes explotan',
      ],
      ['Pour libérer de l’espace disque', 'To free up disk space', 'Para liberar espacio en disco'],
      ['Elles ne servent à rien', 'They are useless', 'No sirven para nada'],
    ],
  ),
  Q(
    2,
    [
      'Sur un Wi-Fi public, que vaut-il mieux éviter ?',
      'On public Wi-Fi, what is best avoided?',
      'En una Wi-Fi pública, ¿qué conviene evitar?',
    ],
    [
      ['Lire les actualités', 'Reading the news', 'Leer las noticias'],
      ['Regarder la météo', 'Checking the weather', 'Mirar el tiempo'],
      [
        'Se connecter à sa banque sans VPN',
        'Signing in to your bank without a VPN',
        'Acceder al banco sin VPN',
      ],
      ['Écouter de la musique', 'Listening to music', 'Escuchar música'],
    ],
  ),
  Q(
    0,
    [
      'Qu’est-ce qu’un gestionnaire de mots de passe ?',
      'What is a password manager?',
      '¿Qué es un gestor de contraseñas?',
    ],
    [
      [
        'Un coffre chiffré qui génère et stocke des mots de passe uniques',
        'An encrypted vault that generates and stores unique passwords',
        'Una caja fuerte cifrada que genera y guarda contraseñas únicas',
      ],
      ['Un antivirus', 'An antivirus', 'Un antivirus'],
      ['Un carnet posé sur le bureau', 'A notebook on the desk', 'Una libreta sobre el escritorio'],
      [
        'Une extension qui bloque la publicité',
        'An extension that blocks ads',
        'Una extensión que bloquea la publicidad',
      ],
    ],
  ),
  Q(
    3,
    ['Qu’est-ce qu’un deepfake ?', 'What is a deepfake?', '¿Qué es un deepfake?'],
    [
      ['Un virus informatique', 'A computer virus', 'Un virus informático'],
      ['Un site du dark web', 'A dark web site', 'Un sitio de la dark web'],
      ['Un mot de passe très long', 'A very long password', 'Una contraseña muy larga'],
      [
        'Un contenu audio ou vidéo truqué par IA pour imiter une personne',
        'Audio or video faked by AI to imitate a person',
        'Un audio o vídeo falsificado con IA para imitar a una persona',
      ],
    ],
  ),
  Q(
    1,
    [
      'Que faire si vous avez saisi votre mot de passe sur un faux site ?',
      'What should you do if you entered your password on a fake site?',
      '¿Qué hacer si introdujo su contraseña en un sitio falso?',
    ],
    [
      ['Rien, ce n’est pas grave', 'Nothing, it is not serious', 'Nada, no es grave'],
      [
        'Le changer immédiatement partout où il est utilisé et activer la 2FA',
        'Change it immediately everywhere it is used and enable 2FA',
        'Cambiarla de inmediato en todos los sitios donde se use y activar la 2FA',
      ],
      ['Attendre quelques jours', 'Wait a few days', 'Esperar unos días'],
      ['Supprimer son navigateur', 'Delete the browser', 'Borrar el navegador'],
    ],
  ),
  Q(
    2,
    [
      'Quelle est la meilleure défense contre une injection SQL ?',
      'What is the best defence against SQL injection?',
      '¿Cuál es la mejor defensa contra la inyección SQL?',
    ],
    [
      ['Cacher le formulaire', 'Hide the form', 'Ocultar el formulario'],
      ['Mettre le site en HTTPS uniquement', 'Only use HTTPS', 'Usar solo HTTPS'],
      [
        'Utiliser des requêtes préparées et valider les entrées',
        'Use prepared statements and validate input',
        'Usar consultas preparadas y validar las entradas',
      ],
      ['Changer la couleur du site', 'Change the site colour', 'Cambiar el color del sitio'],
    ],
  ),
  Q(
    0,
    [
      'Que signifie le principe du moindre privilège ?',
      'What does the principle of least privilege mean?',
      '¿Qué significa el principio de mínimo privilegio?',
    ],
    [
      [
        'Ne donner que les droits strictement nécessaires',
        'Give only the strictly necessary rights',
        'Dar solo los derechos estrictamente necesarios',
      ],
      [
        'Donner les droits administrateur à tous',
        'Give admin rights to everyone',
        'Dar derechos de administrador a todos',
      ],
      ['Supprimer tous les comptes', 'Delete all accounts', 'Eliminar todas las cuentas'],
      [
        'Utiliser un seul compte partagé',
        'Use a single shared account',
        'Usar una sola cuenta compartida',
      ],
    ],
  ),
  Q(
    3,
    [
      'Que veut dire « CTF » en cybersécurité ?',
      'What does “CTF” mean in cybersecurity?',
      '¿Qué significa «CTF» en ciberseguridad?',
    ],
    [
      ['Cyber Trust Firewall', 'Cyber Trust Firewall', 'Cyber Trust Firewall'],
      ['Central Traffic Filter', 'Central Traffic Filter', 'Central Traffic Filter'],
      ['Certified Test Framework', 'Certified Test Framework', 'Certified Test Framework'],
      [
        'Capture The Flag : épreuves où l’on cherche un drapeau caché',
        'Capture The Flag: challenges where you hunt for a hidden flag',
        'Capture The Flag: retos donde se busca una bandera oculta',
      ],
    ],
  ),
  Q(
    1,
    [
      'Quel danger présente une clé USB trouvée par terre ?',
      'What danger does a USB stick found on the ground pose?',
      '¿Qué peligro tiene un pendrive encontrado en el suelo?',
    ],
    [
      ['Aucun, c’est un cadeau', 'None, it is a gift', 'Ninguno, es un regalo'],
      [
        'Elle peut contenir un logiciel malveillant',
        'It may contain malware',
        'Puede contener software malicioso',
      ],
      ['Elle peut seulement être vide', 'It can only be empty', 'Solo puede estar vacío'],
      ['Elle abîme le port USB', 'It damages the USB port', 'Daña el puerto USB'],
    ],
  ),
  Q(
    2,
    [
      'Qu’est-ce qu’une attaque par déni de service distribué (DDoS) ?',
      'What is a distributed denial-of-service (DDoS) attack?',
      '¿Qué es un ataque de denegación de servicio distribuido (DDoS)?',
    ],
    [
      ['Un vol de mots de passe', 'A password theft', 'Un robo de contraseñas'],
      ['Un piratage de webcam', 'A webcam hack', 'Un hackeo de cámara web'],
      [
        'Saturer un service avec un très grand nombre de requêtes pour le rendre indisponible',
        'Flooding a service with requests to make it unavailable',
        'Saturar un servicio con muchas solicitudes para dejarlo inaccesible',
      ],
      ['Une fausse facture par e-mail', 'A fake invoice by email', 'Una factura falsa por correo'],
    ],
  ),
  Q(
    0,
    [
      'Quel est le rôle d’un pare-feu (firewall) ?',
      'What is the role of a firewall?',
      '¿Cuál es la función de un cortafuegos (firewall)?',
    ],
    [
      [
        'Filtrer le trafic réseau selon des règles',
        'Filter network traffic according to rules',
        'Filtrar el tráfico de red según reglas',
      ],
      ['Refroidir l’ordinateur', 'Cool the computer', 'Enfriar el ordenador'],
      ['Chiffrer le disque dur', 'Encrypt the hard drive', 'Cifrar el disco duro'],
      ['Sauvegarder les fichiers', 'Back up files', 'Copiar los archivos'],
    ],
  ),
  Q(
    3,
    [
      'Un « prompt injection » vise…',
      'A “prompt injection” targets…',
      'Una «inyección de prompt» ataca…',
    ],
    [
      ['Un réseau Wi-Fi', 'A Wi-Fi network', 'Una red Wi-Fi'],
      ['Une base de données SQL', 'An SQL database', 'Una base de datos SQL'],
      ['Un disque dur', 'A hard drive', 'Un disco duro'],
      [
        'Un assistant IA, pour lui faire ignorer ses consignes',
        'An AI assistant, to make it ignore its instructions',
        'Un asistente de IA, para que ignore sus instrucciones',
      ],
    ],
  ),
  Q(
    1,
    [
      'Pourquoi ne faut-il pas réutiliser le même mot de passe partout ?',
      'Why should you not reuse the same password everywhere?',
      '¿Por qué no hay que reutilizar la misma contraseña en todas partes?',
    ],
    [
      ['Parce qu’on l’oublie moins', 'Because you forget it less', 'Porque se olvida menos'],
      [
        'Une fuite sur un site permet d’attaquer tous vos autres comptes',
        'A leak on one site lets attackers hit all your other accounts',
        'Una filtración en un sitio permite atacar el resto de sus cuentas',
      ],
      [
        'Parce que c’est interdit par la loi',
        'Because it is against the law',
        'Porque lo prohíbe la ley',
      ],
      [
        'Parce que ça ralentit le site',
        'Because it slows the site down',
        'Porque ralentiza el sitio',
      ],
    ],
  ),
  Q(
    2,
    [
      'Quel indice trahit souvent un e-mail de phishing ?',
      'Which clue often gives away a phishing email?',
      '¿Qué pista suele delatar un correo de phishing?',
    ],
    [
      ['Un message bien orthographié', 'A well-spelled message', 'Un mensaje bien escrito'],
      [
        'Un expéditeur connu depuis des années',
        'A sender known for years',
        'Un remitente conocido desde hace años',
      ],
      [
        'Une urgence, une menace et un lien vers une adresse différente',
        'Urgency, a threat and a link to a different address',
        'Urgencia, una amenaza y un enlace a una dirección distinta',
      ],
      ['Une signature en bas', 'A signature at the bottom', 'Una firma al final'],
    ],
  ),
  Q(
    0,
    [
      'Que signifie le « C » de la triade CID (CIA) ?',
      'What does the “C” in the CIA triad stand for?',
      '¿Qué significa la «C» de la tríada CID (CIA)?',
    ],
    [
      ['Confidentialité', 'Confidentiality', 'Confidencialidad'],
      ['Contrôle', 'Control', 'Control'],
      ['Copie', 'Copy', 'Copia'],
      ['Compression', 'Compression', 'Compresión'],
    ],
  ),
  Q(
    3,
    [
      'Que fait le chiffrement de bout en bout ?',
      'What does end-to-end encryption do?',
      '¿Qué hace el cifrado de extremo a extremo?',
    ],
    [
      ['Il supprime les messages', 'It deletes messages', 'Elimina los mensajes'],
      ['Il rend les messages publics', 'It makes messages public', 'Hace públicos los mensajes'],
      ['Il compresse les images', 'It compresses images', 'Comprime las imágenes'],
      [
        'Seuls l’expéditeur et le destinataire peuvent lire le contenu',
        'Only the sender and recipient can read the content',
        'Solo el remitente y el destinatario pueden leer el contenido',
      ],
    ],
  ),
  Q(
    1,
    [
      'Que faire en premier si un ordinateur est infecté par un ransomware ?',
      'What is the first thing to do if a computer is infected by ransomware?',
      '¿Qué hacer primero si un ordenador está infectado por ransomware?',
    ],
    [
      [
        'Payer la rançon tout de suite',
        'Pay the ransom right away',
        'Pagar el rescate de inmediato',
      ],
      [
        'Le déconnecter du réseau pour limiter la propagation',
        'Disconnect it from the network to limit spread',
        'Desconectarlo de la red para limitar la propagación',
      ],
      ['Redémarrer en boucle', 'Restart it repeatedly', 'Reiniciarlo repetidamente'],
      ['Ouvrir les fichiers chiffrés', 'Open the encrypted files', 'Abrir los archivos cifrados'],
    ],
  ),
  Q(
    2,
    [
      'Comment reconnaître une arnaque au faux conseiller bancaire ?',
      'How can you spot a fake bank advisor scam?',
      '¿Cómo reconocer la estafa del falso asesor bancario?',
    ],
    [
      ['Il ne connaît pas la météo', 'He does not know the weather', 'No sabe qué tiempo hace'],
      ['Il parle lentement', 'He speaks slowly', 'Habla despacio'],
      [
        'Il crée l’urgence et demande codes ou virements : raccrochez et rappelez votre banque',
        'He creates urgency and asks for codes or transfers: hang up and call your bank back',
        'Crea urgencia y pide códigos o transferencias: cuelgue y llame a su banco',
      ],
      ['Il appelle à 9 h', 'He calls at 9 a.m.', 'Llama a las 9 h'],
    ],
  ),
  Q(
    0,
    [
      'Quel est l’intérêt d’un VPN ?',
      'What is the benefit of a VPN?',
      '¿Cuál es la utilidad de una VPN?',
    ],
    [
      [
        'Chiffrer le trafic entre l’appareil et le serveur VPN',
        'Encrypt traffic between the device and the VPN server',
        'Cifrar el tráfico entre el dispositivo y el servidor VPN',
      ],
      ['Rendre invulnérable aux virus', 'Make you immune to viruses', 'Hacerle inmune a los virus'],
      ['Accélérer toujours Internet', 'Always speed up the Internet', 'Acelerar siempre Internet'],
      ['Supprimer la publicité', 'Remove advertising', 'Eliminar la publicidad'],
    ],
  ),
  Q(
    3,
    [
      'Que désigne le mot « exploit » ?',
      'What does the word “exploit” refer to?',
      '¿A qué se refiere la palabra «exploit»?',
    ],
    [
      ['Un antivirus', 'An antivirus', 'Un antivirus'],
      ['Un mot de passe', 'A password', 'Una contraseña'],
      ['Une sauvegarde', 'A backup', 'Una copia de seguridad'],
      [
        'Un code ou une technique qui tire parti d’une vulnérabilité',
        'Code or a technique that takes advantage of a vulnerability',
        'Un código o técnica que aprovecha una vulnerabilidad',
      ],
    ],
  ),
  Q(
    1,
    [
      'Que vaut un certificat qui n’est pas vérifié par un examen corrigé côté serveur ?',
      'What is a certificate worth if no server-graded exam verifies it?',
      '¿Qué valor tiene un certificado que no verifica un examen corregido en el servidor?',
    ],
    [
      ['Autant qu’un vrai', 'As much as a real one', 'Tanto como uno real'],
      [
        'Il est moins fiable : la vérification doit venir du serveur',
        'It is less reliable: verification must come from the server',
        'Es menos fiable: la verificación debe venir del servidor',
      ],
      ['Il est infalsifiable', 'It cannot be forged', 'Es infalsificable'],
      ['Il expire en une heure', 'It expires in an hour', 'Caduca en una hora'],
    ],
  ),
  Q(
    2,
    [
      'Que signifie « zero trust » ?',
      'What does “zero trust” mean?',
      '¿Qué significa «zero trust»?',
    ],
    [
      ['Ne jamais utiliser Internet', 'Never use the Internet', 'No usar nunca Internet'],
      [
        'Faire confiance au réseau interne',
        'Trust the internal network',
        'Confiar en la red interna',
      ],
      [
        'Vérifier chaque accès explicitement, sans confiance implicite',
        'Verify every access explicitly, with no implicit trust',
        'Verificar cada acceso explícitamente, sin confianza implícita',
      ],
      ['Supprimer les mots de passe', 'Remove passwords', 'Eliminar las contraseñas'],
    ],
  ),
];
