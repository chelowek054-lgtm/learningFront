// Реализация порта JobQueue поверх LocalStore (SQLite-таблица job). WS2.
import type { JobInput, JobQueue, JobRecord, LocalStore } from '@/shared/engine';

export function createJobQueue(store: LocalStore): JobQueue {
  return {
    async enqueue(input: JobInput): Promise<JobRecord> {
      const now = new Date().toISOString();
      const job: JobRecord = {
        ...input,
        status: 'pending',
        result: null,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      };
      await store.enqueueJob(job); // идемпотентно по id
      return job;
    },
    pending(): Promise<JobRecord[]> {
      return store.listPendingJobs();
    },
    async resolve(id: string, result: Record<string, unknown>): Promise<void> {
      await store.updateJob(id, {
        status: 'done',
        result,
        updatedAt: new Date().toISOString(),
      });
    },
    async fail(id: string): Promise<void> {
      await store.updateJob(id, { status: 'failed', updatedAt: new Date().toISOString() });
    },
  };
}
