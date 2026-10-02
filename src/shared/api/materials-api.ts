// Материалы пользователя (T-0014): список, чтение, загрузка PDF/Markdown, удаление.
// Читать материал можно без сети: открытое и список кладутся в локальный кэш.
import type { LocalStore } from '@/shared/engine';
import { api, ApiError, getBaseUrl, NetworkError } from './http';
import { getToken } from './token';

export interface MaterialFragment {
  id: string;
  text: string;
  heading?: string;
  page?: number;
}

export interface MaterialSummary {
  id: string;
  module: string;
  source: string;
  title: string;
  fragmentCount: number | null;
  pages: number | null;
  mine: boolean;
}

export interface MaterialFull extends MaterialSummary {
  content: { fragments?: MaterialFragment[]; filename?: string } & Record<string, unknown>;
}

/** Лимит сервера: клиент отсекает заведомо большой файл до загрузки. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Человеческое объяснение отказа сервера: статус сам по себе человеку ничего не говорит. */
export function uploadErrorMessage(e: unknown): string {
  if (e instanceof NetworkError) return 'Нет связи с сервером: загрузить файл можно только онлайн.';
  if (e instanceof ApiError) {
    if (e.status === 413) return 'Файл больше 20 МБ.';
    if (e.status === 415) return 'Поддерживаются PDF, Markdown и текстовые файлы (.md, .txt).';
    if (e.status === 422) {
      return 'В файле нет текста, который можно прочитать (скан без текстового слоя или пустой файл).';
    }
    if (e.status === 401) return 'Нужно войти заново.';
  }
  return 'Не удалось загрузить файл. Попробуйте ещё раз.';
}

export const listMaterials = () => api<MaterialSummary[]>('/content/materials');
export const getMaterial = (id: string) =>
  api<MaterialFull>(`/content/materials/${encodeURIComponent(id)}`);
export const deleteMaterial = (id: string) =>
  api<void>(`/content/materials/${encodeURIComponent(id)}`, { method: 'DELETE' });

export interface PickedFile {
  /** Нативный путь (iOS/Android). */
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  /** На web выбор отдаёт готовый File — он и уходит в форму. */
  file?: Blob;
}

/**
 * Загрузка multipart с прогрессом. fetch прогресс отправки не отдаёт, поэтому
 * XMLHttpRequest: он есть и в React Native, и в браузере.
 */
export async function uploadMaterial(
  picked: PickedFile,
  opts: { module: string; title?: string; onProgress?: (fraction: number) => void },
): Promise<MaterialSummary> {
  if (picked.size !== undefined && picked.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, 'Файл больше 20 МБ');
  }
  const token = await getToken();
  const form = new FormData();
  // В React Native файл — объект { uri, name, type }; на web — Blob.
  if (picked.file) form.append('file', picked.file, picked.name);
  else {
    form.append('file', {
      uri: picked.uri,
      name: picked.name,
      type: picked.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }
  form.append('module', opts.module);
  if (opts.title) form.append('title', opts.title);

  const url = `${getBaseUrl()}/content/materials`;
  return new Promise<MaterialSummary>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && opts.onProgress) opts.onProgress(ev.loaded / ev.total);
    };
    xhr.onerror = () => reject(new NetworkError(getBaseUrl(), null));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(1);
        try {
          resolve(JSON.parse(xhr.responseText) as MaterialSummary);
        } catch {
          reject(new ApiError(xhr.status, 'Ответ сервера не разобран'));
        }
      } else {
        reject(new ApiError(xhr.status, xhr.responseText));
      }
    };
    xhr.send(form);
  });
}

// ---- офлайн-кэш ----
// Лежит в key-value хранилище LocalStore (там же состояние sync и черновики).

const INDEX_KEY = 'materials:index';
const itemKey = (id: string) => `material:${id}`;

export async function cacheMaterialList(store: LocalStore, list: MaterialSummary[]): Promise<void> {
  await store.setSyncState(INDEX_KEY, JSON.stringify(list));
}

export async function cachedMaterialList(store: LocalStore): Promise<MaterialSummary[]> {
  const raw = await store.getSyncState(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MaterialSummary[];
  } catch {
    return [];
  }
}

export async function cacheMaterial(store: LocalStore, m: MaterialFull): Promise<void> {
  await store.setSyncState(itemKey(m.id), JSON.stringify(m));
}

export async function cachedMaterial(store: LocalStore, id: string): Promise<MaterialFull | null> {
  const raw = await store.getSyncState(itemKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MaterialFull;
  } catch {
    return null;
  }
}

/** Убрать материал из кэша (удалён на сервере): пустая строка читается как «нет». */
export async function dropCachedMaterial(store: LocalStore, id: string): Promise<void> {
  await store.setSyncState(itemKey(id), '');
  const list = await cachedMaterialList(store);
  await cacheMaterialList(
    store,
    list.filter((m) => m.id !== id),
  );
}

/**
 * Список: свежий с сервера, а без сети — последний сохранённый.
 * `offline` говорит экрану, что показано кэшированное.
 */
export async function loadMaterialList(
  store: LocalStore,
): Promise<{ items: MaterialSummary[]; offline: boolean }> {
  try {
    const items = await listMaterials();
    await cacheMaterialList(store, items);
    return { items, offline: false };
  } catch (e) {
    if (e instanceof NetworkError) return { items: await cachedMaterialList(store), offline: true };
    throw e;
  }
}

/** Материал целиком: свежий с сервера и в кэш, без сети — из кэша; нет и там — ошибка сети. */
export async function loadMaterial(
  store: LocalStore,
  id: string,
): Promise<{ material: MaterialFull; offline: boolean }> {
  try {
    const material = await getMaterial(id);
    await cacheMaterial(store, material);
    return { material, offline: false };
  } catch (e) {
    if (e instanceof NetworkError) {
      const cached = await cachedMaterial(store, id);
      if (cached) return { material: cached, offline: true };
    }
    throw e;
  }
}
