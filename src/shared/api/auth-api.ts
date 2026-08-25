// Auth-запросы к backend (WS1).
import { api } from './http';
import { setToken, clearToken } from './token';

export interface AuthUser {
  id: string;
  email: string | null;
  /** Админ: курирование канона графа + доступ в /admin. Поле приходит snake_case. */
  is_superuser: boolean;
  profile: Record<string, unknown>;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function register(email: string, password: string): Promise<void> {
  const r = await api<TokenResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  await setToken(r.access_token);
}

export async function login(email: string, password: string): Promise<void> {
  const r = await api<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  await setToken(r.access_token);
}

/** Ответ на запрос кода: одинаков и для незарегистрированного email —
 *  иначе форма позволяла бы перебирать зарегистрированные адреса. */
interface ResetRequested {
  status: string;
  ttl_minutes: number;
}

export function requestPasswordReset(email: string): Promise<ResetRequested> {
  return api<ResetRequested>('/auth/password-reset/request', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email }),
  });
}

/** Код — ровно 8 цифр. Ответ 204: токен не выдаётся, дальше обычный вход. */
export function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return api<void>('/auth/password-reset/confirm', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
}

export async function logout(): Promise<void> {
  await clearToken();
}

export function fetchMe(): Promise<AuthUser> {
  return api<AuthUser>('/auth/me');
}

export function updateProfile(profile: Record<string, unknown>): Promise<AuthUser> {
  return api<AuthUser>('/auth/me/profile', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });
}
