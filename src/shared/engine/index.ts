// shared/engine — доменно-независимое ядро Praxis (ex @praxis/core-engine).
// Инвариант №3: здесь НЕТ строк, специфичных для предметных областей.
// Публичный API: импортировать только из '@/shared/engine'.

export const ENGINE_VERSION = '0.0.0';

// Типы
export type { Activity, Connectivity } from './types/activity';
export type { Grade, GradeCriterion, GradeError } from './types/grade';
export type { Response, ResponseDraft } from './types/response';

// Модульная система
export type {
  ActivityTypeDef,
  ActivityRenderer,
  ActivityRendererProps,
  ImporterDef,
  JSONSchema,
  LocalGrader,
  ModuleManifest,
  SchedulerConfig,
} from './module/manifest';
export { ModuleRegistry, createModuleRegistry } from './module/registry';

// Планировщик FSRS
export type { Rating, Scheduler, FsrsCardState } from './scheduler/scheduler';
export { createScheduler } from './scheduler/scheduler';

// Порты (реализуются адаптерами вне ядра)
export type {
  LocalStore,
  SrsCardRecord,
  SrsCardSource,
  JobRecord,
  JobStatus,
} from './ports/local-store';
export type { SyncClient, SyncPushPayload, SyncPullResult } from './ports/sync';
export type { JobQueue, JobInput } from './ports/jobs';
