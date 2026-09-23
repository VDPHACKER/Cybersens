import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { Question } from '../types';

/**
 * Helper pour créer une instance AI uniquement quand on en a besoin.
 * Les requêtes passent par le relais /api/gemini du serveur, qui ajoute la vraie clé :
 * aucune clé API n'est présente dans le code envoyé au navigateur.
 */
const getAI = () => {
  return new GoogleGenAI({
    apiKey: 'relais-serveur', // valeur factice exigée par le SDK, remplacée côté serveur
    httpOptions: {
      baseUrl: `${window.location.origin}/api/gemini`,
    },
  });
};

/**
 * Chat haute performance optimisé pour le streaming temps réel.
 * Utilisation de gemini-3.8-flash pour des réponses rapides, précises et pédagogiques en cybersécurité.
 */
export const chatWithCyberExpertStream = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[],
  onChunk: (chunk: string) => void,
  image?: { data: string; mimeType: string },
  userContext?: string,
) => {
  const ai = getAI();
  const model = 'gemini-3.8-flash';

  const contents = history.map((h) => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: h.parts,
  }));

  const userParts: any[] = [{ text: message }];
  if (image) {
    userParts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    });
  }
  contents.push({ role: 'user', parts: userParts });

  const config = {
    systemInstruction: `Tu es CyberGuard IA, un expert pédagogique d'élite en cybersécurité, sensibilisation numérique et sécurité de l'Intelligence Artificielle.
TON RÔLE :
- Répondre avec clarté, bienveillance et rigueur technique à toutes les questions de cybersécurité (particuliers, étudiants, développeurs, administrateurs, employés).
- Aider l'utilisateur à identifier les arnaques (phishing, smishing, faux support technique, faux conseillers bancaires, arnaques CPF/livraison/colis).
- Évaluer le niveau de menace lors de l'analyse d'un message suspect, lien, fichier, script ou capture d'écran.
- Donner des instructions claires, concrètes et immédiates pour réagir en cas d'incident (compte piraté, mot de passe compromis, ransomware, etc.).

CODES PRATIQUES & SCRIPTS DÉFENSIFS :
- Dès que l'utilisateur demande un code, un script, un filtre ou une implémentation technique, FOURNIS TOUJOURS des exemples de code pratiques, modernes, complets et commentés (ex: Python pour l'analyse de logs / hachage sécurisé bcrypt/argon2 / vérification d'entropie, Bash pour l'audit et iptables, JavaScript/TypeScript pour la sanitisation et les headers Helmet/CSP, requêtes SQL préparées anti-SQLi).
- Formate toujours le code dans des blocs markdown avec la balise de langage (\`\`\`python, \`\`\`bash, \`\`\`typescript, etc.).
- Explique clairement ce que fait le code et comment le tester en toute sécurité dans un environnement d'apprentissage.

NOUVELLES MENACES & CYBERSÉCURITÉ DE L'IA :
- Tu es spécialisé dans les menaces émergentes liées à l'IA :
  1. Prompt Injections (directes et indirectes dans les systèmes RAG) et Jailbreaks.
  2. Deepfakes audio/vidéo et Voice Cloning (fraude au président, faux appels de détresse).
  3. Empoisonnement de données d'entraînement (Data Poisoning) et modèles compromis.
  4. Attaques de supply chain via hallucinations de packages (package hallucination typosquatting).
  5. Détournement d'agents autonomes (exécution de code non supervisée, exfiltration de tokens).
- Fournis des techniques concrètes de mitigation (guardrails, input sanitization, dual-LLM verification, signatures cryptographiques).

CHALLENGES CTF (CAPTURE THE FLAG) :
- Si l'utilisateur participe à un challenge CTF ou demande un conseil, guide-le avec pédagogie en lui expliquant la démarche d'analyse et les outils (CyberChef, base64, wireshark, inspecteur web, etc.) sans lui donner immédiatement le flag tout fait pour préserver le plaisir d'apprentissage.

STYLE & FORMAT :
- Langue : Réponds systématiquement et fluidement dans la langue demandée par l'utilisateur (${userContext?.includes('lang:en') ? 'English' : userContext?.includes('lang:es') ? 'Español' : 'Français'}).
- Utilise une structure aérée avec des titres en gras, des listes à puces et des étapes numérotées.
- Quand une menace est évaluée, indique clairement l'un des badges :
  🔴 [NIVEAU DE DANGER : ÉLEVÉ / HIGH THREAT]
  🟡 [NIVEAU DE DANGER : MODÉRÉ / MODERATE]
  🟢 [NIVEAU DE DANGER : FAIBLE / LOW RISK]
- Donne toujours :
  1. Diagnostic direct et explication simple du risque
  2. Actions réflexes immédiates (étape par étape) ou code pratique de protection
  3. Règle d'or de prévention pour l'avenir
- Reste stimulant et encourageant : la cybersécurité est une compétence active qui se renforce avec la pratique.
CONTEXTE UTILISATEUR : ${userContext || 'Session de sensibilisation'}.`,
    temperature: 0.6,
    topP: 0.95,
  };

  try {
    const result = await ai.models.generateContentStream({ model, contents, config });
    let receivedAnything = false;
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        receivedAnything = true;
        onChunk(text);
      }
    }
    if (receivedAnything) return;
    // Flux vide (ex: coupé immédiatement par le fournisseur) : on retente sans streaming ci-dessous.
    throw new Error('Réponse en streaming vide');
  } catch (streamError) {
    // Le point d'accès de streaming peut être temporairement indisponible côté fournisseur
    // (503/UNAVAILABLE) alors que l'appel non-streaming fonctionne : on bascule dessus
    // plutôt que d'échouer, la réponse arrive alors en un seul bloc au lieu d'un flux.
    const response = await ai.models.generateContent({ model, contents, config });
    const text = response.text;
    if (!text) throw streamError;
    onChunk(text);
  }
};

/**
 * Synthèse de conversation.
 * Utilisation de gemini-3.8-flash pour une tâche de résumé structurée.
 */
export const summarizeConversation = async (
  history: { role: string; parts: { text: string }[] }[],
) => {
  const ai = getAI();
  const model = 'gemini-3.8-flash';
  const conversationText = history.map((h) => `${h.role}: ${h.parts[0].text}`).join('\n');

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Génère une synthèse concise d'audit de sécurité et recommandations issues de cet échange :\n\n${conversationText}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "Tu es un auditeur en cybersécurité. Fournis une synthèse claire avec : 1. Points abordés 2. Vulnérabilités détectées 3. Plan d'actions recommandées.",
      temperature: 0.2,
    },
  });

  return response.text?.trim() || 'Erreur de génération du rapport.';
};

/**
 * Génération de quiz optimisée avec JSON Schema.
 * Utilisation de gemini-3.8-flash pour des questions de sensibilisation engageantes.
 */
export const generateQuizQuestions = async (
  count: number,
  difficulty: string,
  language: string = 'fr',
): Promise<Question[]> => {
  const ai = getAI();
  const model = 'gemini-3.8-flash';

  const langPrompt =
    language === 'en'
      ? `Generate ${count} concrete cybersecurity awareness questions (Level: ${difficulty}) in English. Topics: phishing, passwords, secure browsing, social engineering, public Wi-Fi, backups, 2FA.`
      : language === 'es'
        ? `Genera ${count} preguntas concretas de concienciación en ciberseguridad (Nivel: ${difficulty}) en español. Temas: phishing, contraseñas, navegación segura, ingeniería social, Wi-Fi público, copias de seguridad, 2FA.`
        : `Génère ${count} questions concrètes de sensibilisation à la cybersécurité (Niveau: ${difficulty}) en français. Sujets variés : hameçonnage, mots de passe, navigation, arnaques courantes, Wi-Fi public, sauvegardes.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: langPrompt }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            category: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: [
            'id',
            'category',
            'difficulty',
            'text',
            'options',
            'correctAnswer',
            'explanation',
          ],
        },
      },
    },
  });

  try {
    const text = response.text;
    const parsed = text ? JSON.parse(text) : [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Quiz JSON error', e);
  }

  // Fallback curated questions in case of network issue or API rate limit
  if (language === 'en') {
    return [
      {
        id: 'q-fb-en-1',
        category: 'Phishing',
        difficulty: 'Medium',
        text: "You receive an urgent email from 'your bank' requesting to verify login credentials following a suspicious transaction. What is the correct response?",
        options: [
          'Click the link to cancel the transaction right away',
          'Reply to the email with only your card number',
          'Do not click, open the official banking app or call your verified branch advisor',
          'Forward the email to all company contacts',
        ],
        correctAnswer: 2,
        explanation:
          'Banks never ask for your password or credentials via unauthenticated email or SMS. Always navigate directly through your known official bookmark or app.',
      },
      {
        id: 'q-fb-en-2',
        category: 'Passwords',
        difficulty: 'Easy',
        text: 'What is the most effective approach to protect multiple online accounts?',
        options: [
          'Reuse a single complicated password so you never forget it',
          'A unique password per account + password manager + two-factor authentication (2FA)',
          'Change password every Monday by incrementing a number',
          'Write all passwords in a cleartext file on your desktop',
        ],
        correctAnswer: 1,
        explanation:
          'Unique passwords prevent credential stuffing breaches across platforms, and 2FA stops over 99% of automated account takeover attempts.',
      },
    ];
  }

  if (language === 'es') {
    return [
      {
        id: 'q-fb-es-1',
        category: 'Phishing',
        difficulty: 'Medio',
        text: "Recibes un correo urgente de 'tu banco' solicitando validar tus credenciales por una transacción sospechosa. ¿Cuál es el reflejo adecuado?",
        options: [
          'Hacer clic en el enlace para cancelar de inmediato la transacción',
          'Responder al correo indicando solo tu tarjeta',
          'No hacer clic, abrir la app oficial del banco o llamar al número oficial',
          'Reenviar el correo a todos tus contactos',
        ],
        correctAnswer: 2,
        explanation:
          'Los bancos nunca solicitan contraseñas ni datos confidenciales por correo electrónico o SMS. Accede siempre mediante la app oficial.',
      },
      {
        id: 'q-fb-es-2',
        category: 'Contraseñas',
        difficulty: 'Fácil',
        text: '¿Cuál es la forma más eficaz de proteger las cuentas online?',
        options: [
          'Usar la misma contraseña compleja en todos los sitios',
          'Una contraseña única por cuenta + gestor de contraseñas + autenticación en dos pasos (2FA)',
          'Cambiar la contraseña cada lunes sumando un dígito',
          'Guardar todas las contraseñas en un archivo de texto en el escritorio',
        ],
        correctAnswer: 1,
        explanation:
          'Las contraseñas únicas evitan que una brecha comprometa el resto de tus cuentas, y el 2FA bloquea la inmensa mayoría de ataques automatizados.',
      },
    ];
  }

  return [
    {
      id: 'q-fb-1',
      category: 'Hameçonnage (Phishing)',
      difficulty: 'Moyen',
      text: "Vous recevez un email urgent de 'votre banque' demandant de valider vos identifiants suite à une transaction suspecte. Quel est le bon réflexe ?",
      options: [
        'Cliquer sur le lien pour annuler immédiatement la transaction',
        "Répondre à l'email en fournissant uniquement votre numéro de carte",
        "Ne pas cliquer, ouvrir l'application officielle de la banque ou appeler son conseiller",
        "Transférer l'email à tous ses contacts pour les prévenir",
      ],
      correctAnswer: 2,
      explanation:
        "Une banque ne demande JAMAIS de ressaisir vos mots de passe ou coordonnées bancaires par email ou SMS. Connectez-vous toujours directement via l'application ou l'URL officielle mémorisée.",
    },
    {
      id: 'q-fb-2',
      category: 'Mots de passe',
      difficulty: 'Facile',
      text: 'Quelle est la méthode la plus efficace pour sécuriser ses comptes en ligne ?',
      options: [
        "Utiliser le même mot de passe complexe partout pour ne pas l'oublier",
        'Un mot de passe unique par compte + gestionnaire de mots de passe + double authentification (2FA)',
        'Changer de mot de passe tous les lundis matins en ajoutant un chiffre',
        'Écrire tous ses mots de passe dans un fichier texte sur le bureau',
      ],
      correctAnswer: 1,
      explanation:
        "L'unicité des mots de passe empêche qu'une fuite sur un site n'entraîne le piratage de tous vos autres comptes. Le 2FA bloque plus de 99% des attaques automatisées.",
    },
    {
      id: 'q-fb-3',
      category: 'Navigation & Réseaux',
      difficulty: 'Moyen',
      text: 'Dans un café ou une gare, vous devez vous connecter au Wi-Fi public gratuit. Quelle précaution est cruciale ?',
      options: [
        'Aucune précaution si le nom du réseau contient le nom du café',
        'Utiliser un VPN sécurisé et éviter les opérations bancaires ou sensibles',
        'Désactiver le pare-feu pour accélérer la connexion',
        'Partager sa position pour calibrer le réseau',
      ],
      correctAnswer: 1,
      explanation:
        "Les Wi-Fi publics peuvent être interceptés par des attaquants (attaque Man-in-the-Middle ou faux point d'accès 'Evil Twin'). Un VPN chiffre tout votre trafic.",
    },
    {
      id: 'q-fb-4',
      category: 'Ingénierie Sociale',
      difficulty: 'Difficile',
      text: "Une personne vous appelle en prétendant être du support informatique et vous demande d'installer un logiciel d'accès à distance pour 'désinfecter' votre PC. Que faire ?",
      options: [
        'Accepter immédiatement pour éviter la panne',
        "Donner le contrôle et s'absenter pendant la manipulation",
        'Raccrocher, ne rien installer et vérifier auprès de son entreprise ou de ses proches',
        'Demander le nom du technicien et lui donner son mot de passe de session',
      ],
      correctAnswer: 2,
      explanation:
        "C'est l'arnaque classique au faux support technique (Tech Support Scam). Les éditeurs comme Microsoft ou Apple n'appellent jamais les particuliers à l'improviste pour signaler un virus.",
    },
  ];
};

/**
 * Analyse SOC instantanée.
 * Utilisation de gemini-3.8-flash pour un verdict de sécurité en direct.
 */
export const analyzeSecurityLog = async (
  data: string,
  image?: { data: string; mimeType: string },
) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: `ANALYSE DE SÉCURITÉ / PHISHING / SUSPICION : ${data}` },
          ...(image ? [{ inlineData: { data: image.data, mimeType: image.mimeType } }] : []),
        ],
      },
    ],
    config: {
      systemInstruction:
        'Expert analyste SOC et cybersécurité. Donne un verdict net et lisible : 1. Niveau de menace (Faible/Moyen/Critique) 2. Indices de compromission/anomalies 3. Action corrective immédiate.',
      temperature: 0.2,
    },
  });
  return response.text;
};
