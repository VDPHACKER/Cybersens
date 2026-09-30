import type { CourseModule } from '../types.ts';
import { COURSE_TRANSLATIONS_EN } from './courseTranslations.en.ts';
import { applyTranslations } from './courseLocalizer.ts';
import { ES_MODULE_1 } from './courseTranslationsEs/module-1.ts';
import { ES_MODULE_2 } from './courseTranslationsEs/module-2.ts';
import { ES_MODULE_3 } from './courseTranslationsEs/module-3.ts';
import { ES_MODULE_4 } from './courseTranslationsEs/module-4.ts';
import { ES_MODULE_5 } from './courseTranslationsEs/module-5.ts';
import { ES_MODULE_6 } from './courseTranslationsEs/module-6.ts';
import { ES_MODULE_7 } from './courseTranslationsEs/module-7.ts';
import { ES_MODULE_8 } from './courseTranslationsEs/module-8.ts';
import { ES_MODULE_9 } from './courseTranslationsEs/module-9.ts';
import { ES_MODULE_10 } from './courseTranslationsEs/module-10.ts';
import { ES_MODULE_11 } from './courseTranslationsEs/module-11.ts';
import { ES_MODULE_12 } from './courseTranslationsEs/module-12.ts';

// Traductions espagnoles : une liste de textes par module, dans l'ordre de collectTranslatableStrings().
// Un module sans traduction retombe sur la version anglaise, ce qui laisse l'application fonctionnelle.
const ES_TEXTS: Record<string, readonly string[]> = {
  'module-1': ES_MODULE_1,
  'module-2': ES_MODULE_2,
  'module-3': ES_MODULE_3,
  'module-4': ES_MODULE_4,
  'module-5': ES_MODULE_5,
  'module-6': ES_MODULE_6,
  'module-7': ES_MODULE_7,
  'module-8': ES_MODULE_8,
  'module-9': ES_MODULE_9,
  'module-10': ES_MODULE_10,
  'module-11': ES_MODULE_11,
  'module-12': ES_MODULE_12,
};

export const COURSE_TRANSLATIONS_ES: CourseModule[] = COURSE_TRANSLATIONS_EN.map((module) =>
  ES_TEXTS[module.id] ? applyTranslations(module, ES_TEXTS[module.id]) : module,
);
