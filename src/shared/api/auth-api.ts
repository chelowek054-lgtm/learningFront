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
