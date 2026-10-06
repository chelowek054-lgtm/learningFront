// Источники знаний для администратора (T-0079, R-0047): загрузка учебника и ход разбора.
// Только для админа: учащийся ни документов, ни ссылок не получает (R-0045).
import { api, ApiError, apiUrl, CLIENT_HEADERS, getBaseUrl, NetworkError } from './http';
import type { PickedFile } from './materials-api';
import { getToken } from './token';

export type IngestStatus = 'new' | 'queued' | 'running' | 'done' | 'failed';

/** Ход разбора документа в понятия: окна, найденное, статус проверки. */
export interface SourceProgress {
  documentId: string;
  title: string;
  status: IngestStatus;
  fragments: number;
  pages: number | null;
  windows: number;
  windowsDone: number;
  truncated: boolean;
  concepts: number;
  drafts: number;
  verified: number;
  dropped: number;
  error: string | null;
}

export interface SourceItem {
  id: string;
  title: string;
  domain: string | null;
  level: string | null;
  license: string | null;
  originUrl: string | null;
  createdAt: string | null;
  progress: SourceProgress;
}

export interface SourceFields {
  domain: string;
  title?: string;
  level?: string;
  license?: string;
  originUrl?: string;
}

export const listSources = () => api<SourceItem[]>('/graph/sources');

export const getSourceProgress = (id: string) =>
  api<SourceProgress>(`/graph/sources/${encodeURIComponent(id)}/progress`);

export const deleteSource = (id: string, keepVerified = false) =>
  api<{ conceptsDeleted: number; conceptsRejected: number; conceptsKept: number }>(
    `/graph/sources/${encodeURIComponent(id)}?keepVerified=${keepVerified}`,
    { method: 'DELETE' },
  );

/** Область под целью, которой нет в графе (T-0084): готовый запрос и ход разбора её документов. */
export interface SourceGap {
  key: string;
  title: string;
  query: string;
  state: 'idle' | 'running';
  documents: SourceProgress[];
}

export type GapFillStatus =
  'queued' | 'nothing_found' | 'nothing_queued' | 'already_running' | 'bad_query';

export interface GapFillResult {
  area: string;
  status: GapFillStatus;
  queued: { documentId: string; title: string; created: boolean }[];
  skipped: { url: string; reason: string }[];
  problems?: string[];
}

export const listSourceGaps = (goal: string, target = 'understand') =>
  api<{ goal: string; target: string; registered: boolean; gaps: SourceGap[] }>(
    `/graph/sources/gaps/${encodeURIComponent(goal)}?target=${encodeURIComponent(target)}`,
  );

export const fillSourceGaps = (
  goal: string,
  areas: { area: string; query?: string }[],
  target = 'understand',
) =>
  api<{ results: GapFillResult[] }>(`/graph/sources/gaps/${encodeURIComponent(goal)}/fill`, {
    method: 'POST',
    body: JSON.stringify({ target, areas }),
  });

/** Причина отказа сервера по-русски: статус человеку ничего не говорит, а текст сервера понятен. */
export function sourceErrorMessage(e: unknown): string {
  if (e instanceof NetworkError) return 'Нет связи с сервером: загрузить файл можно только онлайн.';
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Нужно войти заново.';
    if (e.status === 403) return 'Загружать источники может только администратор.';
    if (e.status === 413) return 'Файл слишком большой.';
    try {
      const detail = (JSON.parse(e.message) as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail) return detail;
    } catch {
      /* ответ не JSON: общее сообщение ниже */
    }
  }
  return 'Не удалось загрузить файл. Попробуйте ещё раз.';
}

/** Загрузка с прогрессом (XHR: fetch не отдаёт прогресс отправки). Вернёт прогресс разбора. */
export async function uploadSource(
  picked: PickedFile,
  fields: SourceFields,
  onProgress?: (fraction: number) => void,
): Promise<SourceProgress & { created: boolean }> {
  const token = await getToken();
  const form = new FormData();
  if (picked.file) form.append('file', picked.file, picked.name);
  else {
    form.append('file', {
      uri: picked.uri,
      name: picked.name,
      type: picked.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }
  form.append('domain', fields.domain);
  if (fields.title) form.append('title', fields.title);
  if (fields.level) form.append('level', fields.level);
  if (fields.license) form.append('license', fields.license);
  if (fields.originUrl) form.append('origin_url', fields.originUrl);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/graph/sources'));
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Client-Version', CLIENT_HEADERS['X-Client-Version']);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(ev.loaded / ev.total);
    };
    xhr.onerror = () => reject(new NetworkError(getBaseUrl(), null));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        try {
          resolve(JSON.parse(xhr.responseText));
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
