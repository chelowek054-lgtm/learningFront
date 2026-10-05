// Очередь записей голоса (T-0040, R-0023): ответ записан без сети — файл ждёт на устройстве и
// уходит при синхронизации. Голос — биометрия, поэтому локальный файл удаляется сразу после
// успешной загрузки (T-0044); дальше на сервере живёт только расшифровка.
import { File } from 'expo-file-system';
import type { LocalStore } from '@/shared/engine';
import { newId } from '../lib';
import { getCurrentUserId } from './current-user';
import { apiUrl, ApiError, CLIENT_HEADERS, NetworkError, getBaseUrl } from './http';
import { getToken } from './token';

export interface VoiceEntry {
  userId: string;
  /** Ответ, к которому относится запись: job расшифровки найдёт его по этому id. */
  responseId: string;
  uri: string;
  mime: string;
}

export interface VoiceDeps {
  upload(entry: VoiceEntry): Promise<{ audioId: string; mime: string }>;
  remove(uri: string): void;
}

const QUEUE_KEY = 'voice-outbox';

async function read(store: LocalStore): Promise<VoiceEntry[]> {
  const raw = await store.getSyncState(QUEUE_KEY);
  try {
    const list = raw ? (JSON.parse(raw) as VoiceEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const write = (store: LocalStore, list: VoiceEntry[]) =>
  store.setSyncState(QUEUE_KEY, JSON.stringify(list));

export async function queueVoice(store: LocalStore, entry: VoiceEntry): Promise<void> {
  await write(store, [...(await read(store)), entry]);
}

export async function pendingVoice(store: LocalStore): Promise<number> {
  return (await read(store)).length;
}

export const defaultVoiceDeps: VoiceDeps = {
  async upload(entry) {
    const token = await getToken();
    const form = new FormData();
    form.append('file', {
      uri: entry.uri,
      name: 'answer',
      type: entry.mime,
    } as unknown as Blob);
    let res: Response;
    try {
      res = await fetch(apiUrl('/languages/speaking/audio'), {
        method: 'POST',
        headers: { ...CLIENT_HEADERS, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
    } catch {
      throw new NetworkError(getBaseUrl(), null);
    }
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return (await res.json()) as { audioId: string; mime: string };
  },
  remove(uri) {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      /* файла уже нет */
    }
  },
};

/**
 * Загрузить накопленные записи и поставить job расшифровки. Запись, которую не удалось
 * отправить из-за сети, остаётся в очереди; отказ сервера по существу (запись пустая или
 * слишком большая) снимает её с очереди — повтор ничего не изменит. Вернёт число отправленных.
 */
export async function flushVoice(
  store: LocalStore,
  deps: VoiceDeps = defaultVoiceDeps,
): Promise<number> {
  const userId = await getCurrentUserId();
  const queue = await read(store);
  const left: VoiceEntry[] = [];
  let sent = 0;
  for (const entry of queue) {
    if (entry.userId !== userId) {
      left.push(entry); // чужая запись на общем устройстве уйдёт, когда вернётся её владелец
      continue;
    }
    try {
      const { audioId, mime } = await deps.upload(entry);
      await store.enqueueJob({
        id: newId(),
        userId: entry.userId,
        type: 'transcribe',
        status: 'pending',
        inputRef: { audioId, responseId: entry.responseId, mime: mime || entry.mime },
        result: null,
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      deps.remove(entry.uri);
      sent += 1;
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) deps.remove(entry.uri);
      else left.push(entry);
    }
  }
  await write(store, left);
  return sent;
}
