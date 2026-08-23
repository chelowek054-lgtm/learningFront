// Порт локального хранилища (реализация — SQLite-адаптер в shared/api, WS6).
import type { Activity } from '../types/activity';
import type { Response } from '../types/response';

export type SrsCardSource = 'error_log' | 'awl' | 'imported' | 'generated';

export interface SrsCardRecord {
  id: string;
  userId: string;
  module: string;
  front: Record<string, unknown>;
  back: Record<string, unknown>;
  source: SrsCardSource;
  /** Сериализованное состояние FSRS. */
  fsrsState: Record<string, unknown>;
  /** ISO-8601. */
  dueAt: string;
  createdAt: string;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface JobRecord {
  id: string;
  userId: string;
  type: string;
  status: JobStatus;
  inputRef: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

/** Все методы асинхронны — реализация может быть на SQLite. */
export interface LocalStore {
  // activity
  upsertActivity(activity: Activity): Promise<void>;
  getActivity(id: string): Promise<Activity | null>;
  listActivities(filter?: { module?: string; type?: string }): Promise<Activity[]>;

  // response — event log
  appendResponse(response: Response): Promise<void>;
  getResponse(id: string): Promise<Response | null>;
  listResponses(): Promise<Response[]>;
  listUnsyncedResponses(): Promise<Response[]>;
  markResponseSynced(id: string): Promise<void>;

  // srs
  upsertSrsCard(card: SrsCardRecord): Promise<void>;
  getSrsCard(id: string): Promise<SrsCardRecord | null>;
  listSrsCards(): Promise<SrsCardRecord[]>;
  listDueSrsCards(nowIso: string): Promise<SrsCardRecord[]>;

  // jobs
  enqueueJob(job: JobRecord): Promise<void>;
  listPendingJobs(): Promise<JobRecord[]>;
  updateJob(id: string, patch: Partial<JobRecord>): Promise<void>;
}
