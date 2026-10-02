// HTTP-клиент к backend. Внедряет JWT из хранилища (инвариант №2: ключ LLM на сервере).
import { APP_VERSION } from './app-version';
import { ClientOutdatedError, notifyClientOutdated, parseOutdatedBody } from './client-outdated';
import { getToken } from './token';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

/** Версия API: несовместимые изменения выходят как /v2 рядом, а не ломают установленные приложения. */
export const API_PREFIX = '/v1';

/** Адрес backend: нужен тем, кто шлёт запрос мимо `api` (загрузка с прогрессом). */
export const getBaseUrl = (): string => BASE_URL;

/** Полный адрес метода API с версией; запрос мимо `api` обязан строить его так же. */
export const apiUrl = (path: string): string => `${BASE_URL}${API_PREFIX}${path}`;

/** Заголовки, которые идут с каждым запросом: версию клиента проверяет сервер. */
export const CLIENT_HEADERS = { 'X-Client-Version': APP_VERSION } as const;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Сеть недоступна: до backend не дошли (нет связи, неверный BASE_URL, CORS). */
export class NetworkError extends Error {
  constructor(
    public url: string,
    cause: unknown,
  ) {
    super(`Нет связи с сервером (${url})`);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

interface ApiOptions extends RequestInit {
  /** Слать Authorization. false — для /auth/login, /auth/register и восстановления пароля. */
  auth?: boolean;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, ...init } = options;
  const token = auth ? await getToken() : null;
  const url = apiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...CLIENT_HEADERS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (e) {
    // fetch реджектится только на сетевом сбое — HTTP-ошибки сюда не попадают.
    throw new NetworkError(BASE_URL, e);
  }
  if (res.status === 426) {
    // Сервер просит обновить приложение: это не ошибка запроса, а состояние всего клиента.
    const err = new ClientOutdatedError(parseOutdatedBody(await res.text().catch(() => '')));
    notifyClientOutdated(err);
    throw err;
  }
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
