// Оркестрация синхронизации (WS8): push локальных изменений + pull и применение.
// Карточки применяются insert-only, чтобы pull не затирал локальный прогресс FSRS;
// прогресс, наоборот, уходит наверх (FR-SYNC-08): сервер решает по updatedAt (LWW).
//
// Инкрементальность (T-0048): между запусками хранится состояние
// { userId, cursor, pushedAt }. Pull просит у сервера только изменения новее
// cursor, push отправляет активности, созданные после прошлого успешного push.
// Состояние привязано к аккаунту: локальная база при смене пользователя не
// очищается, и чужой курсор скрыл бы от нового пользователя его историю.
import type { LocalStore } from '@/shared/engine';
import { serverVersionWins } from '../engine';
import { getCurrentUserId } from './current-user';
import { flushEvidence } from './evidence-api';
import { flushVoice } from './voice-outbox';
import { createSyncClient } from './sync-client';

const STATE_KEY = 'sync';
/** Запас на расхождение часов устройства и на активность, созданную во время sync. */
const PUSH_SLACK_MS = 10_000;

interface SyncState {
  userId: string;
  cursor?: string;
  pushedAt?: string;
}

async function loadState(store: LocalStore, userId: string | null): Promise<SyncState | null> {
  if (!userId) return null;
  const raw = await store.getSyncState(STATE_KEY);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as SyncState;
    return state.userId === userId ? state : null;
  } catch {
    return null;
  }
}

export async function syncNow(store: LocalStore): Promise<void> {
  const client = createSyncClient();
  const userId = await getCurrentUserId();
  const previous = await loadState(store, userId);
  const startedAt = new Date().toISOString();

  // 0. Записи голоса, накопленные без связи: загрузка ставит job расшифровки, и он уйдёт тем же
  // push. Сбой не роняет sync — запись остаётся в очереди до следующего раза.
  try {
    await flushVoice(store);
  } catch {
    // остаётся в очереди
  }

  // 1. PUSH локальных изменений.
  // Активности меняются редко и приходят в основном с сервера, поэтому шлём
  // только созданные после прошлого push; ответы и карточки уже фильтруются флагом synced.
  const pushedFrom = previous?.pushedAt
    ? new Date(Date.parse(previous.pushedAt) - PUSH_SLACK_MS).toISOString()
    : null;
  const activities = (await store.listActivities()).filter(
    (a) => pushedFrom === null || a.createdAt >= pushedFrom,
  );
  const responses = await store.listUnsyncedResponses();
  const jobs = await store.listPendingJobs();
  const srsCards = await store.listUnsyncedSrsCards();

  if (activities.length || responses.length || jobs.length || srsCards.length) {
    const { ackIds } = await client.push({ activities, responses, jobs, srsCards });
    const ack = new Set(ackIds);
    for (const r of responses) {
      if (ack.has(r.id)) await store.markResponseSynced(r.id);
    }
    for (const c of srsCards) {
      if (ack.has(c.id)) await store.markSrsCardSynced(c.id);
    }
  }

  // 2. PULL и применение.
  const pull = await client.pull(previous?.cursor);
  for (const a of pull.activities) await store.upsertActivity(a);
  for (const r of pull.responses) await store.appendResponse({ ...r, synced: true });

  // Новые карточки берём как есть. Уже известные заменяем серверной версией, только если у неё
  // более позднее ревью (R-0019): повторение, сделанное на другом устройстве, не теряется, а
  // локальный прогресс, который свежее, остаётся. Пришедшая версия синхронна с сервером —
  // повторно её не отправляем.
  const local = new Map((await store.listSrsCards()).map((c) => [c.id, c]));
  for (const c of pull.srsCards) {
    const mine = local.get(c.id);
    if (mine && !serverVersionWins(mine.fsrsState, c.fsrsState)) continue;
    await store.upsertSrsCard(c);
    await store.markSrsCardSynced(c.id);
  }

  // Завершённые на сервере jobs: done или failed (с причиной в result).
  for (const j of pull.finishedJobs) {
    await store.updateJob(j.id, { status: j.status, result: j.result ?? null });
  }

  // Состояние сохраняется последним: оборвавшийся на середине sync повторится с
  // прежним курсором, а не потеряет изменения.
  if (userId && pull.cursor && (!pull.userId || pull.userId === userId)) {
    const next: SyncState = { userId, cursor: pull.cursor, pushedAt: startedAt };
    await store.setSyncState(STATE_KEY, JSON.stringify(next));
  }

  // Свидетельства, накопленные без связи, уходят вместе с синхронизацией. Их сбой не должен
  // ронять sync: очередь сохранится до следующего раза.
  try {
    await flushEvidence(store);
  } catch {
    // остаётся в очереди
  }
}
