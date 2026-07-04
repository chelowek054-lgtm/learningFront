// Порт синхронизации (двухфазный push/pull). См. 02-logical.md §5.2.
// Реализация — HTTP-клиент к FastAPI (shared/api/sync-client.ts).
import type { Activity } from '../types/activity';
import type { Response } from '../types/response';
import type { JobRecord, SrsCardRecord } from './local-store';

export interface SyncPushPayload {
  activities: Activity[];
  responses: Response[];
  jobs: JobRecord[];
  srsCards: SrsCardRecord[];
}

export interface SyncPullResult {
  activities: Activity[];
  responses: Response[];
  /** Завершённые на сервере jobs (результаты скоринга/генерации). */
  doneJobs: JobRecord[];
  /** Новые/обновлённые карточки (в т.ч. сгенерированные из error-log). */
  srsCards: SrsCardRecord[];
}

export interface SyncClient {
  /** PUSH: отправить локальные изменения; вернуть id, подтверждённые сервером. */
  push(payload: SyncPushPayload): Promise<{ ackIds: string[] }>;
  /** PULL: забрать серверные изменения с момента since (ISO-8601). */
  pull(since?: string): Promise<SyncPullResult>;
}
