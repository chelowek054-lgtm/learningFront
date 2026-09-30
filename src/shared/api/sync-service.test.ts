import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SrsCardRecord, SyncPullResult, SyncPushPayload } from '../engine';
import { SqliteLocalStore } from './db/sqlite-local-store.web';
import { syncNow } from './sync-service';

// Сеть подменяем: проверяем, что уходит на сервер и как применяется ответ.
const pushed: SyncPushPayload[] = [];
let pullResult: SyncPullResult;
let ackAll = true;

vi.mock('./sync-client', () => ({
  createSyncClient: () => ({
    push: async (p: SyncPushPayload) => {
      pushed.push(p);
      const ids = [...p.srsCards, ...p.responses].map((x) => x.id);
      return { ackIds: ackAll ? ids : [] };
    },
    pull: async () => pullResult,
  }),
}));

const card = (id: string, extra: Partial<SrsCardRecord> = {}): SrsCardRecord => ({
  id,
  userId: 'u',
  module: 'languages',
  front: { word: id },
  back: {},
  source: 'awl',
  fsrsState: { reps: 0 },
  dueAt: '2026-09-30T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});

beforeEach(() => {
  pushed.length = 0;
  ackAll = true;
  pullResult = { activities: [], responses: [], finishedJobs: [], srsCards: [] };
});

describe('syncNow: прогресс повторений', () => {
  it('отправляет изменённую карточку и больше не шлёт её после подтверждения', async () => {
    const store = new SqliteLocalStore();
    await store.upsertSrsCard(card('c1', { fsrsState: { reps: 3 } }));

    await syncNow(store);
    expect(pushed[0].srsCards.map((c) => c.id)).toEqual(['c1']);
    expect(pushed[0].srsCards[0].fsrsState).toEqual({ reps: 3 });
    expect(pushed[0].srsCards[0].updatedAt).toBe('2026-09-01T00:00:00.000Z');

    await syncNow(store);
    expect(pushed).toHaveLength(1); // второй sync: слать нечего
  });

  it('повторяет отправку, если сервер не подтвердил', async () => {
    const store = new SqliteLocalStore();
    await store.upsertSrsCard(card('c1'));
    ackAll = false;
    await syncNow(store);
    ackAll = true;
    await syncNow(store);
    expect(pushed).toHaveLength(2);
    expect(await store.listUnsyncedSrsCards()).toEqual([]);
  });

  it('новый ответ на карточку снова делает её неотправленной', async () => {
    const store = new SqliteLocalStore();
    await store.upsertSrsCard(card('c1'));
    await syncNow(store);
    await store.upsertSrsCard(card('c1', { updatedAt: '2026-09-30T12:00:00.000Z' }));
    await syncNow(store);
    expect(pushed[1].srsCards[0].updatedAt).toBe('2026-09-30T12:00:00.000Z');
  });

  it('карточка, пришедшая с сервера, не отправляется обратно', async () => {
    const store = new SqliteLocalStore();
    pullResult.srsCards = [card('from-server')];
    await syncNow(store);
    expect(await store.getSrsCard('from-server')).not.toBeNull();
    await syncNow(store);
    expect(pushed.flatMap((p) => p.srsCards)).toEqual([]);
  });

  it('pull не затирает локальный прогресс карточки', async () => {
    const store = new SqliteLocalStore();
    await store.upsertSrsCard(card('c1', { fsrsState: { reps: 7 } }));
    pullResult.srsCards = [card('c1', { fsrsState: { reps: 1 } })];
    await syncNow(store);
    expect((await store.getSrsCard('c1'))?.fsrsState).toEqual({ reps: 7 });
  });
});

describe('syncNow: результаты задач', () => {
  it('переносит статус failed с причиной, а не выдаёт его за done', async () => {
    const store = new SqliteLocalStore();
    await store.enqueueJob({
      id: 'j1',
      userId: 'u',
      type: 'grade_writing',
      status: 'pending',
      inputRef: {},
      attempts: 0,
      createdAt: '2026-09-30T00:00:00.000Z',
      updatedAt: '2026-09-30T00:00:00.000Z',
    });
    pullResult.finishedJobs = [
      {
        id: 'j1',
        userId: 'u',
        type: 'grade_writing',
        status: 'failed',
        inputRef: {},
        result: { error: 'провайдер недоступен' },
        attempts: 3,
        createdAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-09-30T00:05:00.000Z',
      },
    ];
    await syncNow(store);
    expect(await store.listPendingJobs()).toEqual([]);
  });
});
