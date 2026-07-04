// Единый event log ответов. FSRS и адаптивный план читают только его (инвариант №4).
import type { Grade } from './grade';

export interface Response {
  id: string;
  activityId: string;
  userId: string;
  /** Ответ пользователя: текст эссе / выбор / код и т.п. */
  userAnswer: unknown;
  /** Результат скоринга или null, пока job pending. */
  grade?: Grade | null;
  /** Время на устройстве (offline-first). ISO-8601. */
  localCreatedAt: string;
  synced: boolean;
}

/** Черновик ответа от рендерера до записи в лог (id/время проставит хранилище). */
export interface ResponseDraft {
  activityId: string;
  userAnswer: unknown;
}
