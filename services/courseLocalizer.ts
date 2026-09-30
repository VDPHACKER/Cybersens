// Localisation des cours par table de traductions : on extrait, dans l'ordre, les textes traduisibles
// d'un module source, puis on réinjecte une liste de traductions de même longueur.
// Tout le reste (identifiants, bonnes réponses, niveaux, icônes, code, schémas ASCII) reste identique au source.
import type { CourseModule } from '../types';

// Champs texte qui ne se traduisent pas : identifiants, énumérations, code et schémas.
const KEEP = new Set([
  'id',
  'moduleCode',
  'curriculumTrack',
  'icon',
  'color',
  'level',
  'duration',
  'sectionNumber',
  'type',
  'language',
  'code',
  'diagramAscii',
]);

type Visitor = (value: string) => string;

const walk = (node: unknown, visit: Visitor): unknown => {
  if (typeof node === 'string') return visit(node);
  if (Array.isArray(node)) return node.map((item) => walk(item, visit));
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = KEEP.has(key) ? value : walk(value, visit);
    }
    return out;
  }
  return node;
};

/** Textes traduisibles d'un module, dans l'ordre de parcours. */
export const collectTranslatableStrings = (module: CourseModule): string[] => {
  const strings: string[] = [];
  walk(module, (value) => {
    strings.push(value);
    return value;
  });
  return strings;
};

/** Copie du module source où chaque texte traduisible est remplacé par sa traduction. */
export const applyTranslations = (
  module: CourseModule,
  translations: readonly string[],
): CourseModule => {
  const expected = collectTranslatableStrings(module).length;
  if (translations.length !== expected) {
    throw new Error(
      `Traductions de ${module.id} : ${translations.length} textes fournis, ${expected} attendus`,
    );
  }
  let i = 0;
  return walk(module, () => translations[i++]) as CourseModule;
};
