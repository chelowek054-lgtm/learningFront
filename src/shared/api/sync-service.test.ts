import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Activity, SrsCardRecord, SyncPullResult, SyncPushPayload } from '../engine';
import { SqliteLocalStore } from './db/sqlite-local-store.web';
import { syncNow } from './sync-service';

// Сеть подменяем: проверяем, что уходит на сервер и как применяется ответ.
const pushed: SyncPushPayload[] = [];
const pullSince: (string | undefined)[] = [];
let pullResult: SyncPullResult;
let currentUser: string | null = 'u';
let ackAll = true;
let flushFails = false;
let flushed = 0;

vi.mock('./sync-client', () => ({
  createSyncClient: () => ({
    push: async (p: SyncPushPayload) => {
      pushed.push(p);
      const ids = [...p.srsCards, ...p.responses].map((x) => x.id);
      return { ackIds: ackAll ? ids : [] };
    },
    pull: async (since?: string) => {
      pullSince.push(since);
      return pullResult;
    },
  }),
}));

vi.mock('./current-user', () => ({ getCurrentUserId: async () => currentUser }));

vi.mock('./voice-outbox', () => ({ flushVoice: async () => 0 }));

// Очередь свидетельств (T-0062) уходит вместе с sync; её сеть здесь не нужна.
vi.mock('./evidence-api', () => ({
  flushEvidence: async () => {
    flushed += 1;
    if (flushFails) throw new Error('нет связи');
    return 0;
  },
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
  pullSince.length = 0;
  currentUser = 'u';
  ackAll = true;
  flushFails = false;
  flushed = 0;
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

  it('повторение с другого устройства принимается, если ревью позже', async () => {
    const store = new SqliteLocalStore();
    await store.upsertSrsCard(
      card('c1', { fsrsState: { reps: 1, last_review: '2026-10-01T10:00:00Z' } }),
    );
    pullResult.srsCards = [
      card('c1', { fsrsState: { reps: 2, last_review: '2026-10-03T10:00:00Z' } }),
    ];
    await syncNow(store);
    expect((await store.getSrsCard('c1'))?.fsrsState).toMatchObject({ reps: 2 });
    // принятая серверная версия не уходит обратно
    pushed.length = 0;
    await syncNow(store);
    expect(pushed.flatMap((p) => p.srsCards)).toEqual([]);
  });

  it('локальное ревью, которое свежее серверного, остаётся', async () => {
    const store = new SqliteLocalStore();
    await store.upsertSrsCard(
      card('c1', { fsrsState: { reps: 3, last_review: '2026-10-04T10:00:00Z' } }),
    );
    pullResult.srsCards = [
      card('c1', { fsrsState: { reps: 2, last_review: '2026-10-03T10:00:00Z' } }),
    ];
    await syncNow(store);
    expect((await store.getSrsCard('c1'))?.fsrsState).toMatchObject({ reps: 3 });
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

const activity = (id: string, createdAt: string): Activity => ({
  id,
  userId: 'u',
  module: 'languages',
  type: 'ielts_writing_task2',
  connectivity: 'online',
  payload: {},
  createdAt,
});

describe('syncNow: инкрементальность (T-0048)', () => {
  it('первый pull полный, следующий просит только новое по курсору сервера', async () => {
    const store = new SqliteLocalStore();
    pullResult = { ...pullResult, cursor: '2026-10-01T10:00:00.000Z', userId: 'u' };

    await syncNow(store);
    await syncNow(store);

    expect(pullSince).toEqual([undefined, '2026-10-01T10:00:00.000Z']);
  });

  it('после первого sync активности, созданные раньше, больше не уходят', async () => {
    const store = new SqliteLocalStore();
    await store.upsertActivity(activity('old', '2020-01-01T00:00:00.000Z'));
    pullResult = { ...pullResult, cursor: 'c1', userId: 'u' };

    await syncNow(store);
    expect(pushed[0].activities.map((a) => a.id)).toEqual(['old']); // первый раз — всё

    await store.upsertActivity(activity('new', new Date(Date.now() + 1000).toISOString()));
    await syncNow(store);
    expect(pushed[1].activities.map((a) => a.id)).toEqual(['new']);
  });

  it('курсор чужого аккаунта не применяется: новый пользователь получает всё', async () => {
    const store = new SqliteLocalStore();
    pullResult = { ...pullResult, cursor: 'c-of-u', userId: 'u' };
    await syncNow(store);

    currentUser = 'other';
    pullResult = { ...pullResult, cursor: 'c-of-other', userId: 'other' };
    await syncNow(store);

    expect(pullSince).toEqual([undefined, undefined]);
  });

  it('если sync оборвался на pull, курсор не сдвигается', async () => {
    const store = new SqliteLocalStore();
    pullResult = { ...pullResult, cursor: 'c1', userId: 'u' };
    await syncNow(store);

    pullResult = { ...pullResult, cursor: 'c2', userId: 'u' };
    const failing = store.upsertActivity.bind(store);
    store.upsertActivity = async () => {
      throw new Error('диск полон');
    };
    pullResult.activities = [activity('a', '2026-10-01T00:00:00.000Z')];
    await expect(syncNow(store)).rejects.toThrow();
    store.upsertActivity = failing;
    pullResult.activities = [];
    await syncNow(store);

    expect(pullSince).toEqual([undefined, 'c1', 'c1']);
  });

  it('без известного пользователя или курсора состояние не сохраняется', async () => {
    const store = new SqliteLocalStore();
    currentUser = null;
    pullResult = { ...pullResult, cursor: 'c1', userId: 'u' };
    await syncNow(store);
    await syncNow(store);

    expect(pullSince).toEqual([undefined, undefined]);
  });
});

describe('syncNow: очередь свидетельств об освоении', () => {
  it('отправляет накопленные свидетельства вместе с синхронизацией', async () => {
    await syncNow(new SqliteLocalStore());

    expect(flushed).toBe(1);
  });

  it('сбой очереди не роняет синхронизацию', async () => {
    flushFails = true;

    await expect(syncNow(new SqliteLocalStore())).resolves.toBeUndefined();
    expect(flushed).toBe(1);
  });
});
