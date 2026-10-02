// Свидетельство об освоении (T-0062, R-0034): любой способ сообщает результат в общем формате,
// а освоенность считает граф. Отправка офлайн-безопасна: без сети свидетельство ждёт в очереди
// на устройстве и уходит при следующей синхронизации.
import type { LocalStore } from '@/shared/engine';
import { getCurrentUserId } from './current-user';
import { api, NetworkError } from './http';

export interface Evidence {
  domain: string;
  conceptId: string;
  /** Ступень освоения: remember, understand, apply… */
  bloom: string;
  /** Результат от 0 до 1. */
  score: number;
  /** Id способа — нужен журналу, на расчёт не влияет. */
  source: string;
}

interface Queued {
  userId: string;
  evidence: Evidence;
}

const QUEUE_KEY = 'evidence-queue';

export const postEvidence = (evidence: Evidence) =>
  api<{ accepted: number }>('/evidence', { method: 'POST', body: JSON.stringify(evidence) });

async function readQueue(store: LocalStore): Promise<Queued[]> {
  const raw = await store.getSyncState(QUEUE_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as Queued[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const writeQueue = (store: LocalStore, list: Queued[]) =>
  store.setSyncState(QUEUE_KEY, JSON.stringify(list));

/**
 * Отправить свидетельство; если связи нет — оставить в очереди. Сервер отказал по существу
 * (например, нет модуля, принимающего свидетельства) — исключение уходит вызывающему.
 */
export async function submitEvidence(
  store: LocalStore,
  evidence: Evidence,
): Promise<'sent' | 'queued'> {
  try {
    await postEvidence(evidence);
    return 'sent';
  } catch (e) {
    if (!isNetworkFailure(e)) throw e;
    const userId = await getCurrentUserId();
    if (!userId) throw e;
    await writeQueue(store, [...(await readQueue(store)), { userId, evidence }]);
    return 'queued';
  }
}

/** Отправить накопленное. Чужие аккаунту записи остаются до их хозяина; отказ сервера — выбрасывает запись. */
export async function flushEvidence(store: LocalStore): Promise<number> {
  const userId = await getCurrentUserId();
  const queue = await readQueue(store);
  if (!userId || queue.length === 0) return 0;

  const rest: Queued[] = [];
  let sent = 0;
  let offline = false;
  for (const item of queue) {
    if (item.userId !== userId || offline) {
      rest.push(item);
      continue;
    }
    try {
      await postEvidence(item.evidence);
      sent += 1;
    } catch (e) {
      if (isNetworkFailure(e)) {
        offline = true;
        rest.push(item);
      }
      // иначе сервер отказал по существу: повтор ничего не изменит
    }
  }
  await writeQueue(store, rest);
  return sent;
}

function isNetworkFailure(e: unknown): boolean {
  return e instanceof NetworkError;
}
