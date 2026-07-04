// Сборка манифестов (метаданные + рендереры) и фабрика реестра приложения.
// Живёт в entities (не под src/app), поэтому expo-router её НЕ сканирует.
// «Встреча» доменов здесь; вызов при старте — в src/app/_layout.tsx (app-слой).
import {
  createModuleRegistry,
  type ActivityRenderer,
  type ActivityTypeDef,
  type ModuleManifest,
  type ModuleRegistry,
} from '@/shared/engine';
import { NotImplementedActivity } from '@/shared/ui';
import { LANGUAGES_MODULE_ID, LANGUAGES_MODULE_TITLE, languagesActivityTypes } from './languages';
import { ML_MODULE_ID, ML_MODULE_TITLE, mlActivityTypes } from './ml';

/** Пока все типы используют единый плейсхолдер-рендерер (Фаза 1 заменит на feature-слайсы). */
function buildManifest(id: string, title: string, types: ActivityTypeDef[]): ModuleManifest {
  return {
    id,
    title,
    activityTypes: types,
    renderers: Object.fromEntries(
      types.map((t): [string, ActivityRenderer] => [t.type, NotImplementedActivity]),
    ),
  };
}

export const languagesModule = buildManifest(
  LANGUAGES_MODULE_ID,
  LANGUAGES_MODULE_TITLE,
  languagesActivityTypes,
);
export const mlModule = buildManifest(ML_MODULE_ID, ML_MODULE_TITLE, mlActivityTypes);

export const moduleManifests: ModuleManifest[] = [languagesModule, mlModule];

/** Создаёт реестр, регистрирует все модули и логирует зарегистрированные типы Activity. */
export function initModuleRegistry(): ModuleRegistry {
  const registry = createModuleRegistry();
  for (const manifest of moduleManifests) {
    registry.registerModule(manifest);
  }
  const types = registry.getActivityTypes().map((t) => t.type);
  console.log(
    `[Praxis] Модулей: ${registry.getModules().length}, ` +
      `типов Activity: ${types.length} → ${types.join(', ')}`,
  );
  return registry;
}

let singleton: ModuleRegistry | undefined;

/** Ленивый синглтон реестра приложения (лог печатается один раз при первом вызове). */
export function getModuleRegistry(): ModuleRegistry {
  if (!singleton) singleton = initModuleRegistry();
  return singleton;
}
