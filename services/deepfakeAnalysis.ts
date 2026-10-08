import { Type } from '@google/genai';
import { getAI } from './geminiService';
import { combineAnalyses, normalizeAnalysis, type DeepfakeAnalysis } from './deepfakeVerdict';

export type AnalysisKind = 'audio' | 'image' | 'video' | 'text';

// Le relais serveur accepte 8 Mo de JSON : le base64 gonfle les fichiers d'environ un tiers
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    usable: {
      type: Type.BOOLEAN,
      description: 'false si la qualité ou la durée ne permet pas une analyse sérieuse',
    },
    verdict: { type: Type.STRING, enum: ['aucun_indice', 'indetermine', 'synthetique_probable'] },
    indicators: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          observation: {
            type: Type.STRING,
            description: 'Ce qui est précisément observé, avec sa localisation (zone, instant)',
          },
          strength: { type: Type.STRING, enum: ['faible', 'moyenne', 'forte'] },
        },
        required: ['name', 'observation', 'strength'],
      },
    },
    limitations: { type: Type.STRING, description: 'Ce qui limite la fiabilité de cette analyse' },
  },
  required: ['usable', 'verdict', 'indicators', 'limitations'],
};

const CRITERIA: Record<AnalysisKind, string> = {
  image:
    'Image : symétrie et reflets des yeux, dents, oreilles et bijoux, mains, cheveux, raccords du contour du visage, cohérence des ombres et des textes en arrière-plan.',
  audio:
    'Audio : respiration et pauses naturelles, prosodie, bruits de bouche, cohérence de l’acoustique de la pièce, artefacts métalliques, coupure spectrale anormale.',
  video:
    'Vidéo : synchronisation labiale, clignements, contour du visage et du cou, cohérence de l’éclairage entre frames, flou localisé, mouvements de tête.',
  text: 'Message : usurpation d’identité ou d’autorité, urgence artificielle, demande d’argent ou d’identifiants, canal inhabituel, lien ou pièce jointe, incohérences factuelles vérifiables. N’essaie PAS de deviner si un texte a été écrit par une IA : ce n’est pas fiable. Pour ce message, « synthetique_probable » signifie « arnaque ou manipulation probable ».',
};

const COMMON_RULES = `Règles impératives :
- Décris uniquement ce que tu observes réellement dans le contenu fourni. N'invente jamais d'indice.
- Un faux positif (accuser à tort un contenu authentique) est PIRE qu'une réserve : en cas de doute, réponds « indetermine ».
- Ne sont PAS des indices : compression, faible résolution, bruit, filtre ou mode beauté, retouche de studio, réduction de bruit, micro de mauvaise qualité, contenu inhabituel ou surprenant.
- « synthetique_probable » exige au moins 2 indices concrets non faibles dont 1 forte, sans explication naturelle plausible.
- « aucun_indice » signifie « rien d'anormal détecté », jamais « preuve d'authenticité ».
- usable = false si le contenu est trop court, trop dégradé ou trop ambigu pour conclure.
- Réponds en français.`;

const ANGLES = [
  `Tu es un analyste forensique. Cherche les indices de génération ou de manipulation par IA.`,
  `Tu es l'avocat de la défense. Pour chaque anomalie possible, cherche d'abord une explication naturelle (compression, éclairage, matériel, retouche courante). Ne retiens comme indice que ce qui reste inexplicable.`,
];

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });

export type AnalysisInput =
  { kind: 'text'; text: string } | { kind: Exclude<AnalysisKind, 'text'>; file: File };

/** Analyse un média ou un message avec deux regards indépendants ; seul leur accord est retenu. */
export const analyzeWithGemini = async (input: AnalysisInput): Promise<DeepfakeAnalysis> => {
  let parts: Record<string, unknown>[];
  if (input.kind === 'text') {
    parts = [{ text: `Message à analyser :\n"""\n${input.text.slice(0, 8000)}\n"""` }];
  } else {
    if (input.file.size > MAX_MEDIA_BYTES)
      throw new Error(`Fichier trop volumineux (maximum ${MAX_MEDIA_BYTES / 1024 / 1024} Mo)`);
    const mimeType = input.file.type || 'application/octet-stream';
    parts = [
      { inlineData: { data: await toBase64(input.file), mimeType } },
      { text: 'Analyse ce média.' },
    ];
  }

  const ai = getAI();
  const runs = await Promise.all(
    ANGLES.map(async (angle) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: `${angle}\n${CRITERIA[input.kind]}\n${COMMON_RULES}`,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      let raw: unknown = null;
      try {
        raw = JSON.parse(response.text ?? '');
      } catch {
        // réponse non JSON : normalizeAnalysis la traitera comme « indéterminé »
      }
      return normalizeAnalysis(raw);
    }),
  );
  return combineAnalyses(runs);
};
