// Порт синхронизации (двухфазный push/pull). См. 02-logical.md §5.2.
// Реализация — HTTP-клиент к FastAPI (WS-fill в Фазе 1).
import type { Response } from '../types/response';
import type { JobRecord, SrsCardRecord } from './local-store';

export interface SyncPushPayload {
  responses: Response[];
  jobs: JobRecord[];
  srsCards: SrsCardRecord[];
}

export interface SyncPullResult {
  /** Завершённые на сервере jobs (результаты скоринга/генерации). */
  doneJobs: JobRecord[];
  /** Новые/обновлённые карточки (в т.ч. сгенерированные). */
  srsCards: SrsCardRecord[];
}

export interface SyncClient {
  /** PUSH: отправить локальные изменения; вернуть id, подтверждённые сервером. */
  push(payload: SyncPushPayload): Promise<{ ackIds: string[] }>;
  /** PULL: забрать серверные изменения с момента since (ISO-8601). */
  pull(since?: string): Promise<SyncPullResult>;
}
