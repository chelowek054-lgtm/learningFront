// HTTP-клиент к backend. Внедряет JWT из хранилища (инвариант №2: ключ LLM на сервере).
import { getToken } from './token';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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
  const url = `${BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (e) {
    // fetch реджектится только на сетевом сбое — HTTP-ошибки сюда не попадают.
    throw new NetworkError(BASE_URL, e);
  }
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
