import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteLocalStore } from './db/sqlite-local-store.web';
import {
  cachedMaterial,
  cachedMaterialList,
  dropCachedMaterial,
  loadMaterial,
  loadMaterialList,
  uploadErrorMessage,
} from './materials-api';

// Сеть подменяем: проверяем кэш и разбор ошибок, а не HTTP. Классы и состояние
// объявлены через vi.hoisted: vi.mock поднимается выше обычных объявлений файла.
const h = vi.hoisted(() => {
  class FakeNetworkError extends Error {}
  class FakeApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    FakeNetworkError,
    FakeApiError,
    state: { online: true, failWith: null as Error | null },
  };
});

const material = (id: string) => ({
  id,
  module: 'k',
  source: 'markdown',
  title: 'T',
  fragmentCount: 2,
  pages: null,
  mine: true,
});

vi.mock('./http', () => ({
  api: async (path: string) => {
    if (h.state.failWith) throw h.state.failWith;
    if (!h.state.online) throw new h.FakeNetworkError('offline');
    if (path === '/content/materials') return [material('m1')];
    return {
      ...material('m1'),
      content: {
        fragments: [
          { id: 'f1', text: 'a' },
          { id: 'f2', text: 'b' },
        ],
      },
    };
  },
  ApiError: h.FakeApiError,
  NetworkError: h.FakeNetworkError,
  getBaseUrl: () => 'http://x',
}));
vi.mock('./token', () => ({ getToken: async () => 't' }));

const { FakeApiError, FakeNetworkError, state } = h;

beforeEach(() => {
  state.online = true;
  state.failWith = null;
});

describe('uploadErrorMessage', () => {
  it('объясняет отказы сервера человеческим языком', () => {
    expect(uploadErrorMessage(new FakeApiError(413, ''))).toContain('20 МБ');
    expect(uploadErrorMessage(new FakeApiError(415, ''))).toContain('PDF');
    expect(uploadErrorMessage(new FakeApiError(422, ''))).toContain('нет текста');
    expect(uploadErrorMessage(new FakeApiError(401, ''))).toContain('войти');
  });

  it('про отсутствие сети говорит прямо, остальное — общей фразой', () => {
    expect(uploadErrorMessage(new FakeNetworkError('x'))).toContain('онлайн');
    expect(uploadErrorMessage(new Error('boom'))).toContain('Не удалось');
  });
});

describe('материалы без сети', () => {
  it('открытый материал читается офлайн из кэша', async () => {
    const store = new SqliteLocalStore();
    const first = await loadMaterial(store, 'm1');
    expect(first.offline).toBe(false);

    state.online = false;
    const again = await loadMaterial(store, 'm1');

    expect(again.offline).toBe(true);
    expect(again.material.content.fragments).toHaveLength(2);
  });

  it('материал, которого не было в кэше, без сети недоступен', async () => {
    state.online = false;
    await expect(loadMaterial(new SqliteLocalStore(), 'never')).rejects.toBeInstanceOf(
      FakeNetworkError,
    );
  });

  it('список обновляет кэш онлайн и отдаётся из него офлайн', async () => {
    const store = new SqliteLocalStore();
    expect((await loadMaterialList(store)).offline).toBe(false);

    state.online = false;
    const offline = await loadMaterialList(store);

    expect(offline.offline).toBe(true);
    expect(offline.items.map((m) => m.id)).toEqual(['m1']);
  });

  it('ошибка сервера не маскируется кэшем', async () => {
    const store = new SqliteLocalStore();
    await loadMaterial(store, 'm1');

    state.failWith = new FakeApiError(404, 'нет такого');

    await expect(loadMaterial(store, 'm1')).rejects.toBe(state.failWith);
  });

  it('удалённый материал исчезает из кэша и из списка', async () => {
    const store = new SqliteLocalStore();
    await loadMaterialList(store);
    await loadMaterial(store, 'm1');

    await dropCachedMaterial(store, 'm1');

    expect(await cachedMaterial(store, 'm1')).toBeNull();
    expect(await cachedMaterialList(store)).toEqual([]);
  });
});
