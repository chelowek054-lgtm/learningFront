// Кэш аудио на устройстве (T-0037): один раз скачали при сети — дальше играет без неё.
import { Directory, File, Paths } from 'expo-file-system';
import { apiUrl, CLIENT_HEADERS, getToken } from '@/shared/api';

const dir = () => new Directory(Paths.document, 'listening');
const fileFor = (key: string) => new File(dir(), `${key}.audio`);

export function cachedUri(key: string): string | null {
  const f = fileFor(key);
  return f.exists ? f.uri : null;
}

/** Скачать запись, если её ещё нет. Без сети и без записи в кэше вернёт null. */
export async function ensureCached(key: string, audioPath: string): Promise<string | null> {
  const have = cachedUri(key);
  if (have) return have;
  try {
    const token = await getToken();
    dir().create({ intermediates: true, idempotent: true });
    const out = await File.downloadFileAsync(apiUrl(audioPath), fileFor(key), {
      headers: { ...CLIENT_HEADERS, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      idempotent: true,
    });
    return out.uri;
  } catch {
    return null;
  }
}
