import { describe, expect, it } from 'vitest';
import { SqliteLocalStore } from '../../../shared/api/db/sqlite-local-store.web';
import { clearDraft, loadDraft, saveDraft } from './code-draft';

describe('черновик решения', () => {
  it('сохраняется и читается по id активности', async () => {
    const store = new SqliteLocalStore();
    await saveDraft(store, 'a1', 'def f(): pass');
    await saveDraft(store, 'a2', 'x = 1');

    expect(await loadDraft(store, 'a1')).toBe('def f(): pass');
    expect(await loadDraft(store, 'a2')).toBe('x = 1');
  });

  it('новый текст заменяет прежний', async () => {
    const store = new SqliteLocalStore();
    await saveDraft(store, 'a1', 'v1');
    await saveDraft(store, 'a1', 'v2');

    expect(await loadDraft(store, 'a1')).toBe('v2');
  });

  it('без сохранения черновика нет', async () => {
    expect(await loadDraft(new SqliteLocalStore(), 'none')).toBeNull();
  });

  it('после очистки читается пустая строка и отправленное решение не возвращается', async () => {
    const store = new SqliteLocalStore();
    await saveDraft(store, 'a1', 'code');
    await clearDraft(store, 'a1');

    expect(await loadDraft(store, 'a1')).toBe('');
  });

  it('не мешает состоянию sync', async () => {
    const store = new SqliteLocalStore();
    await store.setSyncState('sync', '{"cursor":"c"}');
    await saveDraft(store, 'a1', 'code');

    expect(await store.getSyncState('sync')).toBe('{"cursor":"c"}');
  });
});
