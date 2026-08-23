// Сборка реестра модулей с рендерерами (WS5–WS7). Живёт в widgets: может импортировать
// features (рендереры) и entities (метаданные). entities этого делать не может (импорт вниз).
import {
  createModuleRegistry,
  type ActivityRenderer,
  type ActivityTypeDef,
  type LocalGrader,
  type ModuleManifest,
  type ModuleRegistry,
} from '@/shared/engine';
import {
  LANGUAGES_MODULE_ID,
  LANGUAGES_MODULE_TITLE,
  languagesActivityTypes,
  ML_MODULE_ID,
  ML_MODULE_TITLE,
  mlActivityTypes,
} from '@/entities/module';
import { ConceptRecallActivity } from '@/features/concept-recall';
import { IeltsWritingActivity, ieltsWritingLocalGrader } from '@/features/ielts-writing';
import { MaterialReadActivity } from '@/features/material-read';
import { NotImplementedActivity } from '@/shared/ui';

// Тип Activity → рендерер. Незакрытые типы падают на плейсхолдер.
const RENDERERS: Record<string, ActivityRenderer> = {
  ielts_writing_task2: IeltsWritingActivity,
  concept_recall: ConceptRecallActivity,
  material_read: MaterialReadActivity,
};

const LOCAL_GRADERS: Record<string, LocalGrader> = {
  ielts_writing_task2: ieltsWritingLocalGrader,
};

function buildManifest(id: string, title: string, types: ActivityTypeDef[]): ModuleManifest {
  const renderers: Record<string, ActivityRenderer> = {};
  const localGraders: Record<string, LocalGrader> = {};
  for (const t of types) {
    renderers[t.type] = RENDERERS[t.type] ?? NotImplementedActivity;
    const grader = LOCAL_GRADERS[t.type];
    if (grader) localGraders[t.type] = grader;
  }
  return { id, title, activityTypes: types, renderers, localGraders };
}

export const moduleManifests: ModuleManifest[] = [
  buildManifest(LANGUAGES_MODULE_ID, LANGUAGES_MODULE_TITLE, languagesActivityTypes),
  buildManifest(ML_MODULE_ID, ML_MODULE_TITLE, mlActivityTypes),
];

export function initModuleRegistry(): ModuleRegistry {
  const registry = createModuleRegistry();
  for (const manifest of moduleManifests) registry.registerModule(manifest);
  const types = registry.getActivityTypes().map((t) => t.type);
  console.log(`[Praxis] Модулей: ${registry.getModules().length}, типов: ${types.join(', ')}`);
  return registry;
}

let singleton: ModuleRegistry | undefined;

export function getModuleRegistry(): ModuleRegistry {
  if (!singleton) singleton = initModuleRegistry();
  return singleton;
}
