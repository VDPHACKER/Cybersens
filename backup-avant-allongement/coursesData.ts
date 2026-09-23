import { CourseModule } from '../types';

export const COMPREHENSIVE_COURSE_MODULES: CourseModule[] = [
  {
    id: 'module-1',
    moduleCode: 'NETACAD-SEC-101',
    curriculumTrack: 'Fondamentaux de Cybersécurité & Réseaux',
    title: 'Fondamentaux de la Cybersécurité & Architecture Réseau',
    lessonsCount: 5,
    duration: '45 min',
    level: 'Débutant',
    icon: 'Shield',
    color: 'bg-blue-600',
    description: 'Comprendre l’écosystème numérique, le modèle OSI / TCP-IP, la triade CID, la cartographie des menaces et l’architecture de défense en profondeur.',
    moduleObjectives: [
      'Maîtriser la triade Confidentialité - Intégrité - Disponibilité (CID) et le modèle Parkerian Hexad.',
      'Comprendre l’encapsulation des données et les vecteurs d’attaques sur les couches OSI (L2 à L7).',
      'Identifier les mécanismes de persistance des malwares modernes (Ransomwares, Trojans, Rootkits).',
      'Mettre en œuvre les principes d’architecture défensive en profondeur (Defense in Depth).'
    ],
    interactiveLab: {
      id: 'lab-m1',
      title: 'Lab 1.1 : Dissection de Trame & Vérification de l’Ordre CID',
      type: 'terminal',
      instructions: 'Exécutez les commandes de diagnostic réseau fondamentales (ping, traceroute, netstat) pour cartographier le chemin d’un paquet et valider l’intégrité d’une liaison.',
      hints: ['Tapez "ping -c 4 192.168.1.1"', 'Tapez "netstat -tuln" pour inspecter les ports à l’écoute']
    },
    lessons: [
      {
        id: 'm1-l1',
        sectionNumber: '1.1',
        title: 'Le Triptyque CID et les Principes Fondamentaux de Sécurité',
        duration: '8 min',
        content: [
          'La sécurité des systèmes d’information repose sur la triade CID : Confidentialité (les données ne sont accessibles qu’aux entités autorisées), Intégrité (les données ne peuvent être altérées sans détection), et Disponibilité (les services restent opérationnels pour les utilisateurs légitimes).',
          'Les référentiels d’assurance de l’information (NIST, CNSSI 4009) complètent ce modèle avec l’Authenticité (vérification infalsifiable de l’identité) et la Non-répudiation (impossibilité pour un émetteur de nier une action effectuée cryptographiquement).',
          'Toute cyberattaque vise à briser au moins l’un de ces piliers : le vol de base de données brise la Confidentialité, l’empoisonnement DNS brise l’Intégrité, et une attaque DDoS par réflexion brise la Disponibilité.'
        ],
        diagramTitle: 'Architecture du Modèle de Sécurité CID & Défense en Profondeur',
        diagramAscii: `+--------------------------------------------------------+
|             DEFENSE EN PROFONDEUR (NIST)              |
+--------------------------------------------------------+
| [Couche 1] Périmètre : Pare-feu (Firewall) + WAF       |
| [Couche 2] Réseau : VLANs isolés + Détection IDS/IPS   |
| [Couche 3] Hôte : EDR + Durcissement OS + Moindre Priv |
| [Couche 4] Données : Chiffrement AES-256 + Hash SHA-256|
+--------------------------------------------------------+`,
        proTip: 'Astuce NetAcad : Lors d’un audit de sécurité, classez toujours chaque vulnérabilité découverte selon l’impact sur C, I ou D. Ces trois impacts sont justement les métriques d’impact utilisées par le score CVSS (Common Vulnerability Scoring System).',
        securityAlert: 'Attention : Un système 100% sécurisé et hermétique est souvent 0% utilisable. L’ingénieur sécurité doit concilier protection robuste et fluidité opérationnelle.',
        checkYourUnderstanding: {
          question: 'Lorsqu’un ransomware chiffre l’intégralité d’un serveur de base de données d’un hôpital, quels piliers majeurs de la triade CID sont immédiatement anéantis ?',
          options: [
            'Uniquement la Confidentialité car les données sont compressées',
            'La Disponibilité (services inaccessibles) et la Confidentialité (données prises en otage)',
            'Uniquement la Non-répudiation',
            'Aucun, car le chiffrement est une bonne pratique de sécurité'
          ],
          correct: 1,
          explanation: 'Le ransomware détruit immédiatement la Disponibilité des services opérationnels vitaux, et menace la Confidentialité par risque d’exfiltration (double extorsion).'
        },
        keyTakeaways: [
          'La sécurité est une chaîne dont le maillon le plus faible détermine la résistance globale.',
          'La défense en profondeur exige plusieurs couches de protection indépendantes.'
        ]
      },
      {
        id: 'm1-l2',
        sectionNumber: '1.2',
        title: 'Modèle OSI, Encapsulation et Surfaces d’Attaque par Couche',
        duration: '10 min',
        content: [
          'Pour protéger un réseau informatique, il est obligatoire de maîtriser le modèle OSI (Open Systems Interconnection) composé de 7 couches : Physique (L1), Liaison (L2), Réseau (L3), Transport (L4), Session (L5), Présentation (L6) et Application (L7).',
          'Chaque couche possède des protocoles dédiés et des surfaces d’attaques spécifiques : les attaques ARP Spoofing frappent la Couche 2, le spoofing IP et le routage BGP visent la Couche 3, le SYN Flood cible la Couche 4 (TCP), tandis que les failles XSS et SQLi ciblent la Couche 7.',
          'L’encapsulation réseau ajoute un en-tête (Header) à chaque palier : les Données sont encapsulées dans un Segment (L4), puis dans un Paquet (L3), puis dans une Trame Ethernet (L2).'
        ],
        codeSnippet: {
          language: 'bash',
          code: `# Inspection des trames et de l'encapsulation réseau sous Linux
ip link show                # Inspection de la couche 2 (Adresses MAC)
ip -4 addr show             # Inspection de la couche 3 (Adresses IPv4)
ss -tuln                    # Inspection de la couche 4 (Sockets TCP/UDP ouverts)
curl -Iv https://cybersens.org  # Inspection de la couche 7 (Handshake TLS & HTTP/2)`,
          caption: 'Commandes d’inspection système pour chaque couche du modèle OSI'
        },
        proTip: 'Règle d’or : Si la couche inférieure est compromise (ex: Couche 2 avec empoisonnement de table ARP), toutes les couches supérieures non chiffrées sont automatiquement interceptables.',
        checkYourUnderstanding: {
          question: 'À quelle couche du modèle OSI opère une attaque par inondation de requêtes SYN (SYN Flood TCP) ?',
          options: [
            'Couche 2 (Liaison de données)',
            'Couche 3 (Réseau / IP)',
            'Couche 4 (Transport / TCP)',
            'Couche 7 (Application / HTTP)'
          ],
          correct: 2,
          explanation: 'Le protocole TCP opère à la Couche 4 (Transport). Le SYN Flood sature la table des connexions semi-ouvertes de la pile TCP.'
        },
        keyTakeaways: [
          'Chaque couche du modèle OSI doit être inspectée et filtrée (Pare-feu L3/L4 + WAF L7).',
          'L’encapsulation conditionne le transport et l’analyse forensique des paquets réseau.'
        ]
      },
      {
        id: 'm1-l3',
        sectionNumber: '1.3',
        title: 'Taxonomie des Cybermenaces : Malwares, Ransomwares & C2',
        duration: '9 min',
        content: [
          'Les charges utiles malveillantes modernes se divisent en catégories précises : les Virus (nécessitent un hôte pour s’exécuter), les Vers (s’auto-propagent via des failles réseau comme EternalBlue), les Trojans (dissimulés dans des applications légitimes), et les Ransomwares.',
          'Une attaque avancée moderne suit la "Cyber Kill Chain" de Lockheed Martin : 1) Reconnaissance, 2) Armement, 3) Livraison (Phishing), 4) Exploitation, 5) Installation de persistance, 6) Établissement du canal Command & Control (C2), et 7) Actions sur objectifs (Chiffrement et exfiltration).',
          'Les serveurs C2 permettent à l’attaquant d’envoyer des ordres à distance via des canaux furtifs (HTTPS chiffré, requêtes DNS ou requêtes vers des API cloud légitimes).'
        ],
        diagramTitle: 'Cycle d’une Infection de Ransomware avec Double Extorsion',
        diagramAscii: `[Victime (Phishing)] ---> [Téléchargement Dropper] ---> [Infection Locale]
                                                               |
[Serveur C2 Attaquant] <--- [Exfiltration des Fichiers] <-----+
         |
         v
[Chiffrement Local AES-256] ---> [Message Rançon : 24 Heures pour Payer]`,
        proTip: 'Pour détecter les canaux C2, surveillez les requêtes réseau répétitives avec une périodicité fixe (le "beaconing"), même de petite taille.',
        checkYourUnderstanding: {
          question: 'Pourquoi les attaquants utilisent-ils de plus en plus le protocole DNS pour communiquer avec leurs serveurs C2 ?',
          options: [
            'Parce que le DNS est plus rapide que le Wi-Fi',
            'Parce que les requêtes DNS sortantes sont rarement filtrées ou bloquées par les pare-feu d’entreprise',
            'Parce que le DNS chiffre automatiquement tous les fichiers du disque dur',
            'Parce que le protocole DNS n’utilise pas d’adresses IP'
          ],
          correct: 1,
          explanation: 'Le port UDP 53 (DNS) est généralement ouvert sans inspection approfondie dans les entreprises, ce qui en fait un canal idéal de contournement (DNS Tunneling).'
        },
        keyTakeaways: [
          'La rupture de la chaîne d’attaque à n’importe quelle étape préalable neutralise l’attaque.',
          'La détection précoce du beaconing C2 évite le chiffrement final des serveurs.'
        ]
      },
      {
        id: 'm1-l4',
        sectionNumber: '1.4',
        title: 'Politique de Sécurité des Systèmes d’Information (PSSI)',
        duration: '9 min',
        content: [
          'La technologie seule ne peut combler les failles d’organisation. La PSSI définit les règles, responsabilités et directives obligatoires au sein d’une organisation conforme aux normes ISO 27001 et NIST CSF (Cybersecurity Framework).',
          'Le cycle NIST CSF se décompose en 5 fonctions continues : Identifier (actifs et risques), Protéger (mesures d’atténuation), Détecter (SIEM, alertes SOC), Répondre (confinement et remédiation) et Récupérer (restauration des sauvegardes et résilience).',
          'La charte informatique doit formaliser l’usage des clés USB, le télétravail, le BYOD (Bring Your Own Device) et la procédure immédiate de signalement en cas d’anomalie.'
        ],
        checkYourUnderstanding: {
          question: 'Dans le cadre de gestion de crise cyber, quel est le premier réflexe opérationnel lors de la phase de "Réponse" ?',
          options: [
            'Payer immédiatement la rançon demandée pour aller plus vite',
            'Isoler immédiatement les machines infectées du réseau pour stopper la propagation latérale',
            'Formater tous les disques durs sans faire de sauvegarde',
            'Éteindre les commutateurs réseau et supprimer les journaux d’audit'
          ],
          correct: 1,
          explanation: 'L’isolation réseau (déconnexion physique ou VLAN de quarantaine) bloque la propagation latérale du malware sans détruire la mémoire vive volatile.'
        },
        keyTakeaways: [
          'Une PSSI n’a de valeur que si elle est connue, appliquée et testée régulièrement (exercices de crise).',
          'La résilience organisationnelle repose sur des sauvegardes immuables et testées.'
        ]
      },
      {
        id: 'm1-l5',
        sectionNumber: '1.5',
        title: 'Synthèse du Chapitre & Aide-Mémoire NetAcad',
        duration: '9 min',
        content: [
          'Vous avez complété les concepts clés du Module 1. Retenez que chaque action numérique laisse une trace et que la sécurité est une responsabilité partagée.',
          'Points d’ancrage technique : triade CID, segmentation réseau en VLANs isolés, filtrage de ports strict par liste blanche, et principe du moindre privilège appliqué à tous les comptes.',
          'Plan d’action immédiat : inventoriez vos actifs critiques (données, serveurs, comptes), classez chaque risque selon son impact sur C, I ou D, puis vérifiez qu’au moins deux couches de protection indépendantes couvrent chaque actif critique.'
        ],
        checkYourUnderstanding: {
          question: 'Un stagiaire reçoit par défaut les droits administrateur sur tous les serveurs « pour gagner du temps ». Quel principe fondamental du module est violé ?',
          options: [
            'La triade CID, car les données ne sont pas chiffrées',
            'Le modèle OSI, car la couche 7 est exposée',
            'Le principe du moindre privilège : chaque compte ne doit disposer que des droits strictement nécessaires à sa mission',
            'Aucun, les stagiaires doivent pouvoir tout tester'
          ],
          correct: 2,
          explanation: 'Un compte sur-privilégié multiplie l’impact d’une compromission : si ce compte est volé, l’attaquant hérite immédiatement de tous ses droits.'
        },
        keyTakeaways: [
          'Maîtrise de la triade CID et du modèle OSI.',
          'Capacité à identifier le cycle d’attaque Cyber Kill Chain.',
          'Préparation validée pour le laboratoire pratique et l’examen final de certification.'
        ]
      }
    ],
    caseStudy: {
      title: 'Incident Hospitalier : Attaque par Ransomware Ryuk',
      scenario: 'À 02h15 du matin, les postes de soins intensifs d’un centre hospitalier affichent un écran rouge exigeant 50 Bitcoins. Les serveurs de dossiers médicaux sont inaccessibles.',
      threatDetails: 'Infection initiale via un courriel d’hameçonnage ciblé ouvrant un document Word avec macro malveillante (Emotet), suivie d’un mouvement latéral via le protocole SMB (port 445) et exécution du ransomware Ryuk.',
      goodReaction: 'Isolation immédiate du réseau médical, maintien sous tension des machines pour extraction forensique de la RAM, bascule sur les procédures d’urgence papier et restauration depuis des sauvegardes immuables hors-ligne.',
      criticalMistake: 'Éteindre tous les serveurs (détruisant les preuves présentes en mémoire vive : processus malveillants, connexions C2, parfois des clés) et connecter un disque de sauvegarde en réseau qui se fait chiffrer à son tour.'
    },
    examQuestions: [
      {
        id: 'm1-e1',
        category: 'Fondamentaux',
        difficulty: 'Facile',
        text: 'Une attaque DDoS rend le site d’une banque inaccessible pendant 6 heures. Quel pilier de la triade CID est principalement atteint ?',
        options: [
          'La Confidentialité',
          'L’Intégrité',
          'La Disponibilité',
          'La Non-répudiation'
        ],
        correctAnswer: 2,
        explanation: 'Le DDoS vise à empêcher les utilisateurs légitimes d’accéder au service : c’est une atteinte à la Disponibilité.'
      },
      {
        id: 'm1-e2',
        category: 'Réseau',
        difficulty: 'Moyen',
        text: 'À quelle couche du modèle OSI se situe une attaque par ARP Spoofing ?',
        options: [
          'Couche 2 – Liaison de données',
          'Couche 3 – Réseau',
          'Couche 4 – Transport',
          'Couche 7 – Application'
        ],
        correctAnswer: 0,
        explanation: 'ARP associe adresses IP et adresses MAC sur le réseau local : il opère à la couche 2.'
      },
      {
        id: 'm1-e3',
        category: 'Menaces',
        difficulty: 'Moyen',
        text: 'Quelle caractéristique distingue un ver d’un virus ?',
        options: [
          'Le ver chiffre toujours les fichiers',
          'Le ver se propage de manière autonome via le réseau, sans action de l’utilisateur ni fichier hôte',
          'Le ver ne fonctionne que sur smartphone',
          'Le ver est toujours inoffensif'
        ],
        correctAnswer: 1,
        explanation: 'Un virus a besoin d’un hôte et souvent d’une action humaine ; un ver (ex : WannaCry via EternalBlue) s’auto-propage.'
      },
      {
        id: 'm1-e4',
        category: 'Menaces',
        difficulty: 'Difficile',
        text: 'Dans la Cyber Kill Chain, à quelle étape correspond l’envoi d’un e-mail piégé contenant un document malveillant ?',
        options: [
          'Reconnaissance',
          'Livraison',
          'Installation',
          'Actions sur objectifs'
        ],
        correctAnswer: 1,
        explanation: 'La Livraison (Delivery) est le moment où l’arme atteint la cible : pièce jointe, lien, clé USB…'
      },
      {
        id: 'm1-e5',
        category: 'Gouvernance',
        difficulty: 'Moyen',
        text: 'Quelles sont les fonctions historiques du NIST Cybersecurity Framework (complétées par « Gouverner » dans la version 2.0) ?',
        options: [
          'Planifier, Coder, Tester, Déployer, Surveiller',
          'Identifier, Protéger, Détecter, Répondre, Récupérer',
          'Chiffrer, Hacher, Signer, Vérifier, Archiver',
          'Auditer, Sanctionner, Former, Licencier, Recruter'
        ],
        correctAnswer: 1,
        explanation: 'Le NIST CSF organise la gestion du risque cyber autour de ces 5 fonctions ; la version 2.0 (2024) ajoute la fonction transversale « Govern ».'
      }
    ]
  },
  {
    id: 'module-2',
    moduleCode: 'NETACAD-AUTH-201',
    curriculumTrack: 'Gestion des Identités & Cryptographie Pratique',
    title: 'Authentification Robuste, Cryptographie & Gestion des Identités',
    lessonsCount: 5,
    duration: '40 min',
    level: 'Débutant',
    icon: 'Lock',
    color: 'bg-indigo-600',
    description: 'Cryptographie symétrique et asymétrique, fonctions de hachage avec sel (Salt), gestionnaires de secrets et authentification multifacteur (FIDO2 / Passkeys).',
    moduleObjectives: [
      'Différencier le chiffrement symétrique (AES) et asymétrique (RSA/ECC).',
      'Comprendre le fonctionnement des fonctions de hachage cryptographique (SHA-256, bcrypt, Argon2).',
      'Déployer des mécanismes d’authentification multifacteur (TOTP, FIDO2/WebAuthn).',
      'Configurer et auditer un coffre-fort numérique de mots de passe d’entreprise.'
    ],
    interactiveLab: {
      id: 'lab-m2',
      title: 'Lab 2.1 : Génération de Clés & Test de Résistance au Craquage',
      type: 'terminal',
      instructions: 'Générez une paire de clés SSH/RSA, calculez le hash SHA-256 d’un message et comparez l’entropie d’un mot de passe faible versus une phrase de passe robuste.',
      hints: ['Tapez "openssl rand -hex 16"', 'Tapez "echo -n "motdepasse" | sha256sum"']
    },
    lessons: [
      {
        id: 'm2-l1',
        sectionNumber: '2.1',
        title: 'Entropie des Mots de Passe & Attaques par Force Brute',
        duration: '8 min',
        content: [
          'La force d’un secret ne dépend pas seulement de sa complexité visuelle, mais de son entropie mathématique mesurée en bits. L’entropie est calculée par la formule : E = L * log2(R), où L est la longueur et R le réservoir de caractères possibles.',
          'Une phrase de passe de mots tirés au hasard (méthode Diceware, liste de 7 776 mots) apporte environ 12,9 bits par mot : 4 mots ≈ 52 bits, 6 mots ≈ 77 bits. Avec 6 mots (ex: "cheval-pile-fusée-banane-orage-lundi"), elle résiste aux clusters de GPU exploitant Hashcat tout en restant mémorisable. Condition essentielle : les mots doivent être tirés au hasard, pas choisis.',
          'Les attaques par dictionnaire et tables arc-en-ciel (Rainbow Tables) exploitent des milliards de hashs précalculés. Si vous réutilisez le même mot de passe sur deux sites, la fuite du premier compromet immédiatement le second.'
        ],
        codeSnippet: {
          language: 'python',
          code: `# Calcul théorique d'entropie d'une phrase de passe
import math

# Longueur = 20 caractères avec alphabet de 94 caractères (minuscules, majuscules, chiffres, symboles)
entropy = 20 * math.log2(94)
print(f"Entropie : {entropy:.2f} bits (Excellente si > 75 bits)")`,
          caption: 'Script de validation d’entropie cryptographique'
        },
        proTip: 'Règle absolue : Privilégiez TOUJOURS la longueur à la complexité farfelue. 18 caractères simples battent à plate couture 8 caractères bardés de symboles bizarres.',
        checkYourUnderstanding: {
          question: 'Quelle est la principale faiblesse d’un mot de passe comme "P@ssw0rd2026!" ?',
          options: [
            'Il contient trop de caractères',
            'Il suit un modèle prévisible très documenté présent dans tous les dictionnaires d’attaque (ex: rockyou.txt)',
            'Il ne contient pas de majuscule',
            'Il ne peut pas être haché'
          ],
          correct: 1,
          explanation: 'Les substitutions simples (P@ss, 0 pour o, ! à la fin) font partie des premières règles testées par les outils de craquage automatisés.'
        },
        keyTakeaways: [
          'L’entropie exponentielle dépend en priorité du nombre total de caractères.',
          'L’utilisation d’un gestionnaire de mots de passe élimine la charge cognitive de mémorisation.'
        ]
      },
      {
        id: 'm2-l2',
        sectionNumber: '2.2',
        title: 'Fonctions de Hachage Cryptographique & Hachage avec Sel',
        duration: '8 min',
        content: [
          'Une fonction de hachage cryptographique (comme SHA-256) est une fonction mathématique à sens unique qui transforme une entrée de taille arbitraire en une empreinte de taille fixe.',
          'Propriétés obligatoires : Déterminisme, rapidité de calcul, résistance aux préimages (impossible de retrouver l’original à partir du hash) et effet avalanche (un seul bit modifié change 50% du résultat).',
          'Pour stocker des mots de passe en base de données, SHA-256 seul est dangereux car trop rapide (une seule carte graphique récente calcule plus de 20 milliards de hashs SHA-256 par seconde). On utilise des fonctions lentes et adaptatives avec sel (Salt) comme bcrypt, scrypt ou Argon2id (premier choix recommandé par l’OWASP).'
        ],
        proTip: 'Le sel (Salt) est une chaîne aléatoire unique concaténée au mot de passe avant hachage. Il rend les Rainbow Tables totalement inopérantes !',
        checkYourUnderstanding: {
          question: 'Pourquoi ne faut-il JAMAIS stocker des mots de passe hachés avec du simple MD5 ou SHA-1 ?',
          options: [
            'Parce que MD5 n’est pas compatible avec Linux',
            'Parce que ces algorithmes sont conçus pour être extrêmement rapides : un attaquant peut tester des milliards de mots de passe candidats par seconde contre les hashs volés',
            'Parce que les hashs MD5 prennent trop de place en mémoire',
            'Parce que le hachage MD5 nécessite une connexion internet constante'
          ],
          correct: 1,
          explanation: 'Le problème principal n’est pas l’inversion mathématique mais la vitesse : sans sel ni facteur de coût, les mots de passe courants sont retrouvés par force brute ou dictionnaire en quelques minutes. MD5 et SHA-1 souffrent en plus de collisions prouvées.'
        },
        keyTakeaways: [
          'Ne stockez JAMAIS de mots de passe en clair ni avec des algorithmes obsolètes.',
          'Utilisez Argon2id ou bcrypt avec un facteur de coût (Work Factor) adéquat.'
        ]
      },
      {
        id: 'm2-l3',
        sectionNumber: '2.3',
        title: 'Authentification Multifacteur (MFA) & Révolution FIDO2 / Passkeys',
        duration: '8 min',
        content: [
          'L’authentification multifacteur combine au moins 2 facteurs distincts parmi : 1) Ce que vous savez (mot de passe, code PIN), 2) Ce que vous possédez (clé physique FIDO2, smartphone TOTP), 3) Ce que vous êtes (biométrie, empreinte, reconnaissance faciale).',
          'Vulnérabilité du 2FA par SMS : Le SIM Swapping (usurpation de carte SIM auprès de l’opérateur) et l’interception SS7 rendent le SMS hautement faillible.',
          'Le standard FIDO2 / WebAuthn (Passkeys) apporte une résistance native au phishing : la clé cryptographique privée reste stockée dans le processeur sécurisé de l’appareil et la signature est liée au nom de domaine exact (Origin Binding), empêchant toute interception par faux site miroir.'
        ],
        securityAlert: 'Avertissement Fatigue MFA (MFA Prompt Bombing) : Les attaquants envoient des dizaines de notifications push en pleine nuit pour pousser l’utilisateur excédé à cliquer sur "Approuver". Ne validez jamais une notification non initiée !',
        checkYourUnderstanding: {
          question: 'Pourquoi les Passkeys (FIDO2 / WebAuthn) protègent-elles même si l’utilisateur tape ses identifiants sur un faux site de phishing ?',
          options: [
            'Parce qu’elles bloquent la souris de l’attaquant',
            'Grâce à l’Origin Binding cryptographique : le navigateur ne transmet la signature que si le nom de domaine correspond strictement au domaine d’enregistrement',
            'Parce que les Passkeys suppriment la connexion Internet',
            'Parce que le SMS est redirigé vers la police'
          ],
          correct: 1,
          explanation: 'Le protocole FIDO2 lie mathématiquement la signature cryptographique au nom de domaine légitime dans la barre d’adresse.'
        },
        keyTakeaways: [
          'Bannissez le 2FA par SMS au profit des applications d’authentification (TOTP) ou des clés FIDO2.',
          'Sensibilisez les équipes contre les attaques par bombardement de notifications MFA.'
        ]
      },
      {
        id: 'm2-l4',
        sectionNumber: '2.4',
        title: 'Chiffrement Symétrique (AES) vs Asymétrique (RSA/ECC)',
        duration: '8 min',
        content: [
          'Le chiffrement symétrique (ex: AES-256) utilise la même clé secrète pour chiffrer et déchiffrer. Il est extrêmement rapide et idéal pour protéger de gros volumes de données au repos (disque dur, base de données).',
          'Le chiffrement asymétrique (ex: RSA, Courbes Elliptiques / ECC) utilise une paire de clés : une clé publique (diffusée librement pour chiffrer ou vérifier des signatures) et une clé privée (gardée secrète pour déchiffrer ou signer).',
          'En pratique, les protocoles modernes comme TLS 1.3 utilisent un modèle hybride : l’échange asymétrique (Diffie-Hellman éphémère) négocie une clé de session symétrique AES temporaire ultra-rapide.'
        ],
        proTip: 'Pour sécuriser vos communications SSH, privilégiez les clés de type Ed25519 (Courbe elliptique moderne) plutôt que les anciennes clés RSA 2048 bits.',
        checkYourUnderstanding: {
          question: 'Dans une communication sécurisée par chiffrement asymétrique, avec quelle clé l’émetteur doit-il chiffrer un message confidentiel destiné à Alice ?',
          options: [
            'Avec sa propre clé privée',
            'Avec la clé publique d’Alice',
            'Avec la clé privée d’Alice',
            'Avec le mot de passe de sa boîte mail'
          ],
          correct: 1,
          explanation: 'L’émetteur chiffre avec la clé publique d’Alice. Seule Alice, possédant la clé privée correspondante, pourra déchiffrer le message.'
        },
        keyTakeaways: [
          'Chiffrement symétrique pour la rapidité des gros volumes de données.',
          'Chiffrement asymétrique pour la négociation de clés et la signature électronique.'
        ]
      },
      {
        id: 'm2-l5',
        sectionNumber: '2.5',
        title: 'Synthèse du Chapitre & Aide-Mémoire NetAcad',
        duration: '8 min',
        content: [
          'Récapitulatif des acquis : calcul d’entropie, abandon des mots de passe faibles, déploiement du MFA non contournable, stockage de hashs sécurisés avec Argon2id, et chiffrement hybride TLS.',
          'Vous êtes prêt pour valider l’évaluation pratique de ce module.',
          'Plan d’action immédiat : installez un gestionnaire de mots de passe, générez un secret unique par service, activez le MFA (idéalement Passkeys ou clé FIDO2) sur la messagerie et la banque, puis vérifiez vos adresses sur haveibeenpwned.com.'
        ],
        checkYourUnderstanding: {
          question: 'Une startup stocke les mots de passe de ses clients en SHA-256 sans sel et n’impose aucun MFA. Quelle combinaison de correctifs est prioritaire ?',
          options: [
            'Passer à MD5, plus rapide à calculer',
            'Migrer vers Argon2id (ou bcrypt) avec sel unique, et proposer un second facteur résistant au phishing (TOTP, Passkeys)',
            'Chiffrer les mots de passe en AES avec une clé stockée dans le même serveur',
            'Imposer un changement de mot de passe tous les 15 jours'
          ],
          correct: 1,
          explanation: 'Un hachage lent et salé freine le craquage hors-ligne après une fuite ; le MFA empêche l’usage direct d’un mot de passe volé. Les changements forcés trop fréquents poussent au contraire à des mots de passe prévisibles.'
        },
        keyTakeaways: [
          'Maîtrise complète des facteurs d’authentification.',
          'Compréhension des fondements cryptographiques modernes.'
        ]
      }
    ],
    caseStudy: {
      title: 'Compromission Uber : Attaque par Fatigue MFA',
      scenario: 'Un attaquant du groupe Lapsus$ achète les identifiants volés d’un sous-traitant Uber sur le Darknet. Bloqué par le 2FA, il spamme l’employé de notifications push à 1h du matin puis le contacte sur WhatsApp en se faisant passer pour le support informatique.',
      threatDetails: 'Technique d’épuisement psychologique combinée à de l’ingénierie sociale (MFA Fatigue / Push Bombing). L’employé finit par accepter une notification pour faire cesser les alertes.',
      goodReaction: 'Rejeter systématiquement les notifications non sollicitées, signaler immédiatement l’attaque à l’équipe SOC et exiger le passage aux clés matérielles FIDO2 résistantes au rejeu.',
      criticalMistake: 'Accepter la notification push pour arrêter les alertes nocturnes, offrant un accès direct au réseau interne de l’entreprise.'
    },
    examQuestions: [
      {
        id: 'm2-e1',
        category: 'Mots de passe',
        difficulty: 'Moyen',
        text: 'Avec une liste Diceware de 7 776 mots, combien de mots tirés au hasard faut-il environ pour dépasser 75 bits d’entropie ?',
        options: [
          '2 mots',
          '4 mots',
          '6 mots',
          '12 mots'
        ],
        correctAnswer: 2,
        explanation: 'Chaque mot apporte log2(7776) ≈ 12,9 bits : 4 mots ≈ 52 bits, 6 mots ≈ 77 bits.'
      },
      {
        id: 'm2-e2',
        category: 'Cryptographie',
        difficulty: 'Moyen',
        text: 'Quel est le rôle du sel (salt) dans le stockage des mots de passe ?',
        options: [
          'Chiffrer le mot de passe pour pouvoir le relire',
          'Rendre chaque empreinte unique, ce qui neutralise les tables arc-en-ciel et empêche de repérer les mots de passe identiques',
          'Accélérer le calcul du hash',
          'Remplacer le MFA'
        ],
        correctAnswer: 1,
        explanation: 'Un sel aléatoire propre à chaque compte oblige l’attaquant à attaquer chaque hash séparément.'
      },
      {
        id: 'm2-e3',
        category: 'Authentification',
        difficulty: 'Facile',
        text: 'Quel second facteur résiste le mieux à une page de phishing qui relaie les identifiants en temps réel ?',
        options: [
          'Un code reçu par SMS',
          'Un code TOTP d’application',
          'Une Passkey / clé FIDO2 liée au nom de domaine',
          'Une question secrète'
        ],
        correctAnswer: 2,
        explanation: 'Les codes SMS et TOTP peuvent être recopiés par l’attaquant sur le vrai site ; la signature FIDO2 est liée à l’origine et refusée sur un faux domaine.'
      },
      {
        id: 'm2-e4',
        category: 'Cryptographie',
        difficulty: 'Difficile',
        text: 'Dans TLS 1.3, pourquoi utilise-t-on à la fois de la cryptographie asymétrique et symétrique ?',
        options: [
          'Par tradition historique',
          'L’asymétrique (Diffie-Hellman éphémère, signatures) établit et authentifie une clé de session ; le symétrique (AES, ChaCha20) chiffre ensuite rapidement les données',
          'Le symétrique sert uniquement à signer les certificats',
          'L’asymétrique est plus rapide pour les gros volumes'
        ],
        correctAnswer: 1,
        explanation: 'C’est le modèle hybride : l’asymétrique résout l’échange de clés, le symétrique apporte la performance.'
      },
      {
        id: 'm2-e5',
        category: 'Authentification',
        difficulty: 'Moyen',
        text: 'Vous recevez 15 notifications MFA à 2 h du matin sans avoir tenté de vous connecter. Que faites-vous ?',
        options: [
          'Vous acceptez pour faire cesser les notifications',
          'Vous refusez toutes les demandes, changez votre mot de passe (il est probablement compromis) et alertez l’équipe sécurité',
          'Vous désinstallez l’application d’authentification',
          'Vous attendez le matin sans rien faire'
        ],
        correctAnswer: 1,
        explanation: 'Ces notifications prouvent que l’attaquant connaît déjà votre mot de passe : c’est une attaque par fatigue MFA.'
      }
    ]
  },
  {
    id: 'module-3',
    moduleCode: 'NETACAD-ENG-301',
    curriculumTrack: 'Ingénierie Sociale & Sécurité Humaine',
    title: 'Ingénierie Sociale, Phishing Avancé & Manipulation Psychologique',
    lessonsCount: 5,
    duration: '45 min',
    level: 'Intermédiaire',
    icon: 'AlertTriangle',
    color: 'bg-cyan-600',
    description: 'Analyse des leviers d’influence (Cialdini), détection des attaques Spear-Phishing, Smishing, Vishing et procédures de validation anti-usurpation.',
    moduleObjectives: [
      'Identifier les 6 vecteurs psychologiques d’influence exploités par les pirates.',
      'Décortiquer les en-têtes techniques de courriel (SPF, DKIM, DMARC) pour détecter l’usurpation de domaine.',
      'Reconnaître les scénarios de Smishing, Vishing et QRishing (Quishing).',
      'Instaurer une culture de sécurité organisationnelle sans blâme (No-Blame Culture).'
    ],
    interactiveLab: {
      id: 'lab-m3',
      title: 'Lab 3.1 : Analyse d’En-Têtes SMTP & Traque d’Usurpation',
      type: 'terminal',
      instructions: 'Inspectez un en-tête d’e-mail suspect pour extraire l’adresse IP d’origine réelle du serveur d’envoi et vérifier l’alignement des signatures cryptographiques SPF et DKIM.',
      hints: ['Vérifiez les champs "Received: from" et "Authentication-Results"']
    },
    lessons: [
      {
        id: 'm3-l1',
        sectionNumber: '3.1',
        title: 'Les 6 Leviers Psychologiques de Robert Cialdini Exploités en Cyber',
        duration: '9 min',
        content: [
          'L’ingénierie sociale ne s’attaque pas aux failles logicielles, mais aux biais cognitifs humains. Les pirates exploitent systématiquement les leviers théorisés par le Dr Robert Cialdini.',
          'Les 6 principes de Cialdini : 1) L’Autorité (usurpation d’un PDG, d’un policier ou d’un avocat), 2) La Rareté et l’urgence ("Votre compte sera supprimé dans 20 minutes"), 3) La Réciprocité (rendre un faux service préalable), 4) La Preuve Sociale ("Tous vos collègues ont déjà validé le formulaire"), 5) La Sympathie (se rendre aimable, trouver des points communs) et 6) L’Engagement et la cohérence (obtenir un petit "oui" avant la vraie demande). Les attaquants y ajoutent souvent la peur et la curiosité.',
          'L’objectif est de court-circuiter le raisonnement analytique de la victime en déclenchant un état de stress émotionnel qui pousse à l’action immédiate.'
        ],
        diagramTitle: 'Le Cycle d’Attaque par Ingénierie Sociale',
        diagramAscii: `[Collecte OSINT (LinkedIn, Réseaux)] ---> [Identification de la Cible]
                                                      |
[Prise de Contact sous Faible Identité] <-------------+
         |
         v
[Déclenchement du Levier (Urgence/Peur)] ---> [Exécution : Clic, Transfert, Mot de passe]`,
        proTip: 'Conseil en entreprise : Dès qu’un courriel ou un message provoque un sentiment d’urgence aiguë ou de peur, ralentissez volontairement le rythme. Prenez 5 minutes de recul : la plupart de ces attaques reposent sur la précipitation et échouent dès que la victime prend le temps de vérifier.',
        checkYourUnderstanding: {
          question: 'Quel levier psychologique est directement exploité lorsqu’un message annonce : "Urgent : Votre colis est bloqué en douane, payez 1,99€ avant minuit sous peine de destruction" ?',
          options: [
            'La preuve sociale et la réciprocité',
            'L’urgence artificielle combinée à la peur de perdre un bien',
            'La cryptographie quantique',
            'L’autorité judiciaire d’un huissier assermenté'
          ],
          correct: 1,
          explanation: 'L’attaquant combine un délai arbitraire court (urgence) avec la crainte d’un préjudice financier ou matériel.'
        },
        keyTakeaways: [
          'L’ingénierie sociale cible l’émotion pour désactiver l’analyse critique.',
          'La règle d’or : Plus la demande est urgente, plus la vérification doit être méthodique.'
        ]
      },
      {
        id: 'm3-l2',
        sectionNumber: '3.2',
        title: 'Dissection Technique d’un E-mail : SPF, DKIM & DMARC',
        duration: '9 min',
        content: [
          'Le protocole SMTP originel ne comporte aucune authentification d’expéditeur native : n’importe qui peut envoyer un mail en inscrivant "president@elysee.fr" dans le champ From.',
          'Pour contrer l’usurpation, trois normes techniques ont été standardisées : 1) SPF (Sender Policy Framework : enregistrement DNS listant les adresses IP autorisées à émettre pour le domaine), 2) DKIM (DomainKeys Identified Mail : signature cryptographique asymétrique de l’en-tête et du corps du message), et 3) DMARC (Domain-based Message Authentication : directive exigeant que SPF ou DKIM soit valide et aligné avec le domaine affiché, et indiquant aux serveurs récepteurs comment traiter les échecs : "none", "quarantine" ou "reject").',
          'En analysant les en-têtes bruts d’un message ("Authentication-Results: dkim=fail ..."), l’analyste identifie immédiatement l’imposture.'
        ],
        codeSnippet: {
          language: 'bash',
          code: `# Vérification DNS des enregistrements de protection anti-usurpation
dig +short TXT google.com | grep spf    # Affichage de la politique SPF
dig +short TXT _dmarc.google.com        # Affichage de la politique DMARC (ex: p=reject)`,
          caption: 'Commandes d’interrogation DNS pour auditer la protection d’un domaine'
        },
        proTip: 'Si la politique DMARC d’une organisation est "p=reject", les faux e-mails usurpant son nom de domaine sont automatiquement détruits avant d’atteindre les boîtes de réception.',
        checkYourUnderstanding: {
          question: 'Que signifie un résultat "dmarc=fail (p=reject)" dans l’en-tête d’un courriel entrant ?',
          options: [
            'Le courriel est parfaitement légitime',
            'Le message a échoué aux contrôles d’authenticité et le domaine de l’expéditeur exige son rejet immédiat car il s’agit d’une usurpation',
            'Le serveur de messagerie n’a plus d’espace disque',
            'Le message a été chiffré avec succès'
          ],
          correct: 1,
          explanation: 'La politique p=reject ordonne la mise au rebut immédiate du message frauduleux non authentifié.'
        },
        keyTakeaways: [
          'L’adresse affichée dans le client de messagerie est falsifiable sans DMARC.',
          'L’inspection des en-têtes SMTP est une compétence clé d’analyse défensive.'
        ]
      },
      {
        id: 'm3-l3',
        sectionNumber: '3.3',
        title: 'Spear-Phishing, Vishing (Téléphone) & Quishing (QR Codes)',
        duration: '9 min',
        content: [
          'Le Spear-Phishing (harponnage) est une attaque ciblée sur-mesure basée sur des semaines de renseignement en sources ouvertes (OSINT). Le pirate connaît votre nom, vos projets en cours et le nom de votre responsable.',
          'Le Vishing (Voice Phishing) combine l’appel téléphonique et la manipulation psychologique pour soutirer des accès. Avec l’avènement des Deepfakes audio, les attaquants clonent la voix exacte d’un dirigeant en quelques secondes.',
          'Le Quishing (QR Code Phishing) exploite la confiance des utilisateurs dans les QR codes imprimés (restaurants, bornes de recharge, courriers papiers) pour rediriger les smartphones vers des pages de connexion malveillantes indétectables par les passerelles e-mail classiques.'
        ],
        checkYourUnderstanding: {
          question: 'Pourquoi le Quishing (phishing par QR code) pose-t-il un défi majeur aux solutions de sécurité informatique traditionnelles ?',
          options: [
            'Parce que les QR codes ne fonctionnent que la nuit',
            'Parce que le lien malveillant est masqué sous forme d’image et souvent scanné depuis un smartphone personnel hors du périmètre sécurisé de l’entreprise',
            'Parce que les QR codes détruisent la puce GPS du téléphone',
            'Parce que les QR codes sont interdits par la loi'
          ],
          correct: 1,
          explanation: 'Le lien est encodé graphiquement, contournant les filtres de texte traditionnels, et incite l’utilisateur à utiliser un appareil mobile moins protégé.'
        },
        keyTakeaways: [
          'Vérifiez systématiquement l’URL de destination avant de valider l’ouverture d’un QR code.',
          'Ne validez jamais une demande critique reçue par téléphone sans protocole de contre-appel.'
        ]
      },
      {
        id: 'm3-l4',
        sectionNumber: '3.4',
        title: 'La Fraude au Président (FOVI) & Protocole de Contre-Appel',
        duration: '9 min',
        content: [
          'La Fraude aux Ordres de Virement Internationaux (FOVI) coûte des centaines de millions d’euros chaque année. L’escroc se fait passer pour le Directeur Général ou un avocat mandaté et exige d’un collaborateur comptable un virement confidentiel urgent pour une "acquisition stratégique secrète".',
          'La riposte institutionnelle exige : 1) La double signature obligatoire pour tout virement au-delà d’un seuil défini, 2) L’interdiction formelle de déroger aux procédures sous prétexte d’urgence, 3) Le contre-appel obligatoire sur un canal officiel préétabli.',
          'Une organisation mature encourage la vérification sans craindre les reproches hiérarchiques.'
        ],
        checkYourUnderstanding: {
          question: 'Un « avocat mandaté par le PDG » exige par e-mail un virement confidentiel urgent et fournit un numéro pour le rappeler. Quelle est la bonne procédure ?',
          options: [
            'Appeler le numéro fourni dans l’e-mail pour confirmer',
            'Exécuter le virement, puisque l’avocat a cité le nom du PDG',
            'Rappeler le PDG ou la direction financière sur un numéro interne déjà connu et appliquer la double signature, même sous pression',
            'Répondre à l’e-mail pour demander s’il s’agit bien d’eux'
          ],
          correct: 2,
          explanation: 'Le contre-appel n’a de valeur que sur un canal préétabli. Le numéro ou l’adresse fournis par l’escroc mènent directement à ses complices.'
        },
        keyTakeaways: [
          'La sécurité des processus financiers prime sur toute urgence apparente.',
          'Le contre-appel doit être effectué sur un numéro interne connu, jamais sur le numéro fourni dans le message suspect.'
        ]
      },
      {
        id: 'm3-l5',
        sectionNumber: '3.5',
        title: 'Synthèse du Chapitre & Aide-Mémoire NetAcad',
        duration: '9 min',
        content: [
          'Bilan des compétences du Module 3 : identification des biais psychologiques, vérification des en-têtes SMTP (SPF/DKIM/DMARC), parade contre le Spear-Phishing et application des procédures de vérification financière.',
          'Vous pouvez à présent tester vos connaissances sur les cas d’étude du module.',
          'Plan d’action immédiat : affichez la procédure de contre-appel près des postes de la comptabilité, vérifiez la politique DMARC de votre domaine (dig TXT _dmarc.votre-domaine) et organisez une campagne de sensibilisation suivie d’un exercice de phishing bienveillant.'
        ],
        checkYourUnderstanding: {
          question: 'Un collègue avoue avoir cliqué sur un lien de phishing il y a une heure. Quelle réaction organisationnelle est la plus efficace ?',
          options: [
            'Le sanctionner publiquement pour l’exemple',
            'Ne rien dire pour éviter la panique',
            'Le remercier de son signalement rapide, réinitialiser ses identifiants et prévenir l’équipe sécurité pour vérifier les connexions suspectes',
            'Lui demander d’effacer l’e-mail et d’oublier l’incident'
          ],
          correct: 2,
          explanation: 'Une culture « sans blâme » accélère les signalements. Chaque minute gagnée réduit la fenêtre d’exploitation des identifiants volés.'
        },
        keyTakeaways: [
          'Le facteur humain devient une force de détection grâce à la formation continue.',
          'Compréhension des indicateurs techniques d’hameçonnage.'
        ]
      }
    ],
    caseStudy: {
      title: 'Attaque Pathé Cinémas : 19 Millions d’Euros Dérobés par FOVI',
      scenario: 'Des attaquants usurpent l’identité du PDG du groupe Pathé et envoient des courriels à la filiale néerlandaise pour ordonner des virements ultra-confidentiels vers Dubaï pour une prétendue opération de rachat.',
      threatDetails: 'L’attaquant utilise une adresse e-mail très similaire (typosquattage) et invoque le secret le plus absolu, interdisant aux directeurs financiers locaux d’en parler à leurs collègues.',
      goodReaction: 'Refus catégorique de déroger au circuit de double validation interne, contre-appel physique au siège parisien sur la ligne fixe directe et blocage bancaire conservatoire.',
      criticalMistake: 'Exécuter les virements successifs par soumission à une autorité feinte, sans exiger de confirmation orale directe et de double signature.'
    },
    examQuestions: [
      {
        id: 'm3-e1',
        category: 'Psychologie',
        difficulty: 'Facile',
        text: 'Un faux technicien vous a aidé la semaine dernière et vous demande aujourd’hui « un petit service » : votre identifiant. Quel levier de Cialdini est exploité ?',
        options: [
          'La réciprocité',
          'La rareté',
          'La preuve sociale',
          'L’engagement'
        ],
        correctAnswer: 0,
        explanation: 'Après un service rendu, nous nous sentons redevables : l’attaquant exploite ce besoin de rendre la pareille.'
      },
      {
        id: 'm3-e2',
        category: 'E-mail',
        difficulty: 'Moyen',
        text: 'Quel mécanisme publie dans le DNS la liste des serveurs autorisés à envoyer des e-mails pour un domaine ?',
        options: [
          'DKIM',
          'SPF',
          'DMARC',
          'S/MIME'
        ],
        correctAnswer: 1,
        explanation: 'SPF liste les IP autorisées ; DKIM signe le message ; DMARC fixe la politique en cas d’échec et exige l’alignement avec le domaine affiché.'
      },
      {
        id: 'm3-e3',
        category: 'Phishing',
        difficulty: 'Moyen',
        text: 'Un QR code collé sur une borne de parking renvoie vers une page de paiement. Quel est le meilleur réflexe ?',
        options: [
          'Payer rapidement pour éviter l’amende',
          'Vérifier l’URL affichée avant d’ouvrir et payer uniquement via l’application ou le site officiel saisi manuellement',
          'Scanner le QR code avec un deuxième téléphone',
          'Partager le QR code à ses collègues'
        ],
        correctAnswer: 1,
        explanation: 'Les autocollants QR frauduleux superposés aux vrais sont un vecteur de quishing courant.'
      },
      {
        id: 'm3-e4',
        category: 'Fraude',
        difficulty: 'Difficile',
        text: 'Quelle mesure organisationnelle bloque le plus efficacement la fraude au président (FOVI) ?',
        options: [
          'Un antivirus plus récent',
          'La double validation obligatoire des virements et le contre-appel sur un numéro connu, sans dérogation possible pour cause d’urgence',
          'Le chiffrement des e-mails',
          'L’interdiction des téléphones au bureau'
        ],
        correctAnswer: 1,
        explanation: 'La FOVI contourne la technique en manipulant l’humain ; seule une procédure non contournable l’arrête.'
      },
      {
        id: 'm3-e5',
        category: 'Phishing',
        difficulty: 'Moyen',
        text: 'Qu’est-ce qui distingue le spear-phishing d’une campagne de phishing classique ?',
        options: [
          'Il n’utilise jamais l’e-mail',
          'Il est personnalisé grâce à des informations collectées sur la cible (OSINT) : nom du responsable, projets en cours…',
          'Il est toujours envoyé la nuit',
          'Il ne contient jamais de lien'
        ],
        correctAnswer: 1,
        explanation: 'Le harponnage cible une personne précise avec un message crédible, ce qui le rend bien plus difficile à détecter.'
      }
    ]
  }
];
