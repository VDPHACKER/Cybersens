// Garde-fous anti faux positifs pour l'analyse de médias : le modèle propose, ce code décide.
// Règle d'or : au moindre doute, le verdict est « indéterminé », jamais une accusation.

export type DeepfakeVerdict = 'aucun_indice' | 'indetermine' | 'synthetique_probable';
export type IndicatorStrength = 'faible' | 'moyenne' | 'forte';

export interface DeepfakeIndicator {
  name: string;
  observation: string;
  strength: IndicatorStrength;
}

export interface DeepfakeAnalysis {
  verdict: DeepfakeVerdict;
  indicators: DeepfakeIndicator[];
  limitations: string;
  /** Explique pourquoi le verdict a été rétrogradé en « indéterminé », le cas échéant. */
  downgradeReason?: string;
}

const VERDICTS: DeepfakeVerdict[] = ['aucun_indice', 'indetermine', 'synthetique_probable'];
const STRENGTHS: IndicatorStrength[] = ['faible', 'moyenne', 'forte'];

const undetermined = (reason: string, limitations = ''): DeepfakeAnalysis => ({
  verdict: 'indetermine',
  indicators: [],
  limitations,
  downgradeReason: reason,
});

/**
 * Valide une réponse brute du modèle et applique les règles de prudence :
 * - réponse mal formée ou média de qualité insuffisante → indéterminé ;
 * - « synthétique probable » exige au moins 2 indices dont 1 fort, sinon indéterminé ;
 * - « aucun indice » avec 2 indices moyens ou plus (ou 1 fort) est incohérent → indéterminé.
 */
export const normalizeAnalysis = (raw: unknown): DeepfakeAnalysis => {
  if (!raw || typeof raw !== 'object') return undetermined('Réponse inexploitable');
  const r = raw as Record<string, unknown>;

  const verdict = VERDICTS.find((v) => v === r.verdict);
  if (!verdict) return undetermined('Verdict absent ou invalide');

  const indicators: DeepfakeIndicator[] = (Array.isArray(r.indicators) ? r.indicators : [])
    .map((i): DeepfakeIndicator | null => {
      if (!i || typeof i !== 'object') return null;
      const o = i as Record<string, unknown>;
      const strength = STRENGTHS.find((s) => s === o.strength);
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      const observation = typeof o.observation === 'string' ? o.observation.trim() : '';
      // Un indice sans observation concrète n'est pas une preuve : on l'écarte
      if (!strength || !name || observation.length < 10) return null;
      return { name, observation, strength };
    })
    .filter((i): i is DeepfakeIndicator => i !== null);

  const limitations = typeof r.limitations === 'string' ? r.limitations.trim() : '';

  if (r.usable === false)
    return undetermined('Qualité du média insuffisante pour conclure', limitations);

  const strong = indicators.filter((i) => i.strength === 'forte').length;
  const notWeak = indicators.filter((i) => i.strength !== 'faible').length;

  if (verdict === 'synthetique_probable' && !(notWeak >= 2 && strong >= 1))
    return {
      verdict: 'indetermine',
      indicators,
      limitations,
      downgradeReason: 'Indices insuffisants pour affirmer une génération artificielle',
    };

  if (verdict === 'aucun_indice' && (strong >= 1 || notWeak >= 2))
    return {
      verdict: 'indetermine',
      indicators,
      limitations,
      downgradeReason: 'Le modèle signale des indices incompatibles avec « aucun indice »',
    };

  return { verdict, indicators, limitations };
};

/**
 * Fusionne plusieurs analyses indépendantes du même média : seul un accord total est retenu.
 * Un désaccord, même partiel, donne « indéterminé » (principale protection contre les faux positifs).
 */
export const combineAnalyses = (analyses: DeepfakeAnalysis[]): DeepfakeAnalysis => {
  if (analyses.length === 0) return undetermined('Aucune analyse disponible');
  const first = analyses[0];
  if (analyses.every((a) => a.verdict === first.verdict)) {
    // Même verdict : on garde les indices de la première analyse et les limites de toutes
    const limitations = [...new Set(analyses.map((a) => a.limitations).filter(Boolean))].join(' ');
    return { ...first, limitations };
  }
  return {
    verdict: 'indetermine',
    indicators: analyses.flatMap((a) => a.indicators).slice(0, 6),
    limitations: analyses.map((a) => a.limitations).find(Boolean) ?? '',
    downgradeReason: 'Les analyses indépendantes ne concordent pas',
  };
};
