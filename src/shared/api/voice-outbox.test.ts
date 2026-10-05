import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteLocalStore } from './db/sqlite-local-store.web';
import { ApiError, NetworkError } from './http';
import {
  flushVoice,
  pendingVoice,
  queueVoice,
  type VoiceDeps,
  type VoiceEntry,
} from './voice-outbox';

let currentUser: string | null = 'u';
vi.mock('./current-user', () => ({ getCurrentUserId: async () => currentUser }));
vi.mock('expo-file-system', () => ({ File: class {} }));
vi.mock('../lib', () => ({ newId: () => `id-${Math.random()}` }));
vi.mock('./token', () => ({ getToken: async () => null }));
vi.mock('./http', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  class NetworkError extends Error {
    constructor(_url: string, _cause: unknown) {
      super('network');
    }
  }
  return {
    ApiError,
    NetworkError,
    apiUrl: (p: string) => p,
    CLIENT_HEADERS: {},
    getBaseUrl: () => '',
  };
});

const entry = (over: Partial<VoiceEntry> = {}): VoiceEntry => ({
  userId: 'u',
  responseId: 'r1',
  uri: 'file:///voice/r1.m4a',
  mime: 'audio/m4a',
  ...over,
});

describe('voice-outbox', () => {
  let store: SqliteLocalStore;
  let removed: string[];
  let deps: VoiceDeps;
  beforeEach(() => {
    store = new SqliteLocalStore();
    currentUser = 'u';
    removed = [];
    deps = {
      upload: async () => ({ audioId: 'a1', mime: 'audio/m4a' }),
      remove: (uri) => removed.push(uri),
    };
  });

  it('загружает запись, ставит job расшифровки и удаляет файл с устройства', async () => {
    await queueVoice(store, entry());
    expect(await flushVoice(store, deps)).toBe(1);
    expect(removed).toEqual(['file:///voice/r1.m4a']);
    expect(await pendingVoice(store)).toBe(0);
    const jobs = await store.listPendingJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      type: 'transcribe',
      inputRef: { audioId: 'a1', responseId: 'r1' },
    });
  });

  it('без сети запись остаётся в очереди вместе с файлом', async () => {
    await queueVoice(store, entry());
    deps.upload = async () => {
      throw new NetworkError('x', null);
    };
    expect(await flushVoice(store, deps)).toBe(0);
    expect(removed).toEqual([]);
    expect(await pendingVoice(store)).toBe(1);
    expect(await store.listPendingJobs()).toHaveLength(0);
  });

  it('отказ сервера по существу снимает запись с очереди', async () => {
    await queueVoice(store, entry());
    deps.upload = async () => {
      throw new ApiError(422, 'Запись пустая');
    };
    await flushVoice(store, deps);
    expect(await pendingVoice(store)).toBe(0);
    expect(removed).toHaveLength(1);
  });

  it('чужую запись не отправляет', async () => {
    await queueVoice(store, entry({ userId: 'other' }));
    expect(await flushVoice(store, deps)).toBe(0);
    expect(await pendingVoice(store)).toBe(1);
  });
});
