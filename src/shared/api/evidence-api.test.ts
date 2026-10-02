import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteLocalStore } from './db/sqlite-local-store.web';
import { flushEvidence, submitEvidence, type Evidence } from './evidence-api';

const h = vi.hoisted(() => {
  class FakeNetworkError extends Error {}
  return {
    FakeNetworkError,
    state: {
      offline: false,
      reject: false,
      userId: 'u1' as string | null,
      posted: [] as unknown[],
    },
  };
});

vi.mock('./http', () => ({
  NetworkError: h.FakeNetworkError,
  api: vi.fn(async (_path: string, init: { body: string }) => {
    if (h.state.offline) throw new h.FakeNetworkError('нет связи');
    if (h.state.reject) throw new Error('409');
    h.state.posted.push(JSON.parse(init.body));
    return { accepted: 1 };
  }),
}));
vi.mock('./current-user', () => ({ getCurrentUserId: async () => h.state.userId }));

const ev = (conceptId: string): Evidence => ({
  domain: 'd',
  conceptId,
  bloom: 'remember',
  score: 0.8,
  source: 'first_letters',
});

describe('свидетельство об освоении', () => {
  let store: SqliteLocalStore;
  beforeEach(() => {
    store = new SqliteLocalStore();
    Object.assign(h.state, { offline: false, reject: false, userId: 'u1', posted: [] });
  });

  it('при связи уходит сразу', async () => {
    expect(await submitEvidence(store, ev('a'))).toBe('sent');
    expect(h.state.posted).toHaveLength(1);
  });

  it('без связи ждёт в очереди и уходит при следующей отправке', async () => {
    h.state.offline = true;
    expect(await submitEvidence(store, ev('a'))).toBe('queued');
    expect(h.state.posted).toHaveLength(0);

    h.state.offline = false;
    expect(await flushEvidence(store)).toBe(1);
    expect(h.state.posted).toHaveLength(1);
    expect(await flushEvidence(store)).toBe(0); // очередь опустела
  });

  it('пока связи нет, очередь не теряется', async () => {
    h.state.offline = true;
    await submitEvidence(store, ev('a'));
    await submitEvidence(store, ev('b'));

    expect(await flushEvidence(store)).toBe(0);

    h.state.offline = false;
    expect(await flushEvidence(store)).toBe(2);
  });

  it('отказ сервера по существу не маскируется под отсутствие сети', async () => {
    h.state.reject = true;
    await expect(submitEvidence(store, ev('a'))).rejects.toThrow('409');
    h.state.reject = false;
    expect(await flushEvidence(store)).toBe(0);
  });

  it('записи другого аккаунта не уходят под чужим именем', async () => {
    h.state.offline = true;
    await submitEvidence(store, ev('a'));
    h.state.offline = false;
    h.state.userId = 'u2';

    expect(await flushEvidence(store)).toBe(0);

    h.state.userId = 'u1';
    expect(await flushEvidence(store)).toBe(1);
  });
});
