// Контракт модульной системы (клиент). См. docs/architecture/02-logical.md §3.1.
import type { Activity, Connectivity } from '../types/activity';
import type { Grade } from '../types/grade';
import type { ResponseDraft } from '../types/response';

/** JSON Schema payload'а — валидируется модулем. Плейсхолдер до наполнения. */
export type JSONSchema = Record<string, unknown>;

export interface ActivityTypeDef {
  type: string;
  connectivity: Connectivity;
  payloadSchema: JSONSchema;
  /** Питает ли этот тип SRS через error-log. */
  producesErrorLog?: boolean;
}

export interface ActivityRendererProps {
  activity: Activity;
  onComplete: (draft: ResponseDraft) => void;
}

/**
 * UI-рендерер Activity. На клиенте это React-компонент, но ядро НЕ зависит от React:
 * возвращаемый тип opaque (`unknown` ⊇ `React.ReactNode`), поэтому любой RN-компонент
 * присваиваем сюда без импорта react в engine (инвариант №3).
 */
export type ActivityRenderer = (props: ActivityRendererProps) => unknown;

/** Офлайн-fallback: мгновенный черновой сигнал без LLM. */
export type LocalGrader = (answer: unknown, payload: Record<string, unknown>) => Partial<Grade>;

export interface ImporterDef {
  id: string;
  title: string;
  /** MIME-типы, которые принимает пайплайн импорта (напр. 'application/pdf'). */
  accepts: string[];
}

export interface SchedulerConfig {
  requestRetention?: number;
  maximumInterval?: number;
}

export interface ModuleManifest {
  id: string;
  title: string;
  activityTypes: ActivityTypeDef[];
  renderers: Record<string, ActivityRenderer>;
  localGraders?: Record<string, LocalGrader>;
  importers?: ImporterDef[];
  schedulerConfig?: SchedulerConfig;
}
