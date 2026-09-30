// Оркестрация синхронизации (WS8): push локальных изменений + pull и применение.
// Карточки применяются insert-only, чтобы pull не затирал локальный прогресс FSRS;
// прогресс, наоборот, уходит наверх (FR-SYNC-08): сервер решает по updatedAt (LWW).
import type { LocalStore } from '@/shared/engine';
import { createSyncClient } from './sync-client';

export async function syncNow(store: LocalStore): Promise<void> {
  const client = createSyncClient();

  // 1. PUSH локальных изменений.
  const activities = await store.listActivities();
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
  const pull = await client.pull();
  for (const a of pull.activities) await store.upsertActivity(a);
  for (const r of pull.responses) await store.appendResponse({ ...r, synced: true });

  // Новые карточки — только те, которых ещё нет локально (сохраняем прогресс повторений).
  // Пришедшая с сервера карточка уже синхронна с ним: повторно её не отправляем.
  const existing = new Set((await store.listSrsCards()).map((c) => c.id));
  for (const c of pull.srsCards) {
    if (existing.has(c.id)) continue;
    await store.upsertSrsCard(c);
    await store.markSrsCardSynced(c.id);
  }

  // Завершённые на сервере jobs: done или failed (с причиной в result).
  for (const j of pull.finishedJobs) {
    await store.updateJob(j.id, { status: j.status, result: j.result ?? null });
  }
}
