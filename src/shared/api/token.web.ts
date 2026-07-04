// Хранилище JWT (web): localStorage (SecureStore на web недоступен).
const KEY = 'praxis.access_token';

export async function getToken(): Promise<string | null> {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
}

export async function setToken(token: string): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, token);
}

export async function clearToken(): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}
