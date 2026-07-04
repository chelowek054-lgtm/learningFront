// Порт очереди отложенных AI-задач (мост offline → online). См. 02-logical.md §5.1.
import type { JobRecord } from './local-store';

/** Поля, которые задаёт вызывающий; status/attempts/время проставляет очередь. */
export type JobInput = Pick<JobRecord, 'id' | 'userId' | 'type' | 'inputRef'>;

export interface JobQueue {
  /** Поставить задачу (status='pending'). Идемпотентно по job.id. */
  enqueue(input: JobInput): Promise<JobRecord>;
  /** Задачи, ожидающие отправки/исполнения. */
  pending(): Promise<JobRecord[]>;
  /** Пометить успешно завершённой с результатом. */
  resolve(id: string, result: Record<string, unknown>): Promise<void>;
  /** Пометить неуспешной (attempts++). */
  fail(id: string): Promise<void>;
}
