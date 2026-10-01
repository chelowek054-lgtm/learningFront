// Черновик решения задачи на код: хранится локально, чтобы работа не пропадала
// без сети и при закрытии приложения. Живёт в key-value хранилище LocalStore
// (то же, где состояние sync) под префиксом `draft:`.
import type { LocalStore } from '@/shared/engine';

const key = (activityId: string) => `draft:${activityId}`;

export async function loadDraft(store: LocalStore, activityId: string): Promise<string | null> {
  return store.getSyncState(key(activityId));
}

/** Пустой текст — это «черновика нет», а не черновик из пустой строки. */
export async function saveDraft(
  store: LocalStore,
  activityId: string,
  code: string,
): Promise<void> {
  await store.setSyncState(key(activityId), code);
}

/** После отправки черновик не нужен: решение ушло в event log. */
export async function clearDraft(store: LocalStore, activityId: string): Promise<void> {
  await store.setSyncState(key(activityId), '');
}
