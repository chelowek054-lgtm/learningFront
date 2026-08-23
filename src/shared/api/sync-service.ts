// Оркестрация синхронизации (WS8): push локальных изменений + pull и применение.
// Карточки применяются insert-only, чтобы pull не затирал локальный прогресс FSRS.
import type { LocalStore } from '@/shared/engine';
import { createSyncClient } from './sync-client';

export async function syncNow(store: LocalStore): Promise<void> {
  const client = createSyncClient();

  // 1. PUSH локальных изменений.
  const activities = await store.listActivities();
  const responses = await store.listUnsyncedResponses();
  const jobs = await store.listPendingJobs();

  if (activities.length || responses.length || jobs.length) {
    const { ackIds } = await client.push({ activities, responses, jobs, srsCards: [] });
    const ack = new Set(ackIds);
    for (const r of responses) {
      if (ack.has(r.id)) await store.markResponseSynced(r.id);
    }
  }

  // 2. PULL и применение.
  const pull = await client.pull();
  for (const a of pull.activities) await store.upsertActivity(a);
  for (const r of pull.responses) await store.appendResponse({ ...r, synced: true });

  // Новые карточки — только те, которых ещё нет локально (сохраняем прогресс повторений).
  const existing = new Set((await store.listSrsCards()).map((c) => c.id));
  for (const c of pull.srsCards) {
    if (!existing.has(c.id)) await store.upsertSrsCard(c);
  }

  // Завершённые на сервере jobs — отметить локально.
  for (const j of pull.doneJobs) {
    await store.updateJob(j.id, { status: 'done', result: j.result ?? null });
  }
}
