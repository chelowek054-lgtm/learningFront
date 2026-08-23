// Общий поток отправки продукции на скоринг (WS5/WS7).
// Создаёт response (event log) + job(grade_*); работает офлайн, job резолвится при sync.
import type { LocalStore } from '@/shared/engine';
import { newId } from '@/shared/lib';
import { createJobQueue } from './job-queue';

export interface SubmitParams {
  activityId: string;
  userId: string;
  answer: unknown;
  jobType: 'grade_writing' | 'grade_concept';
  rubricId: string;
}

/** Записать ответ и поставить задачу на скоринг. Возвращает responseId. */
export async function submitForGrading(store: LocalStore, p: SubmitParams): Promise<string> {
  const now = new Date().toISOString();
  const responseId = newId();
  await store.appendResponse({
    id: responseId,
    activityId: p.activityId,
    userId: p.userId,
    userAnswer: p.answer,
    grade: null,
    localCreatedAt: now,
    synced: false,
  });
  const queue = createJobQueue(store);
  await queue.enqueue({
    id: newId(),
    userId: p.userId,
    type: p.jobType,
    inputRef: { responseId, rubricId: p.rubricId },
  });
  return responseId;
}
