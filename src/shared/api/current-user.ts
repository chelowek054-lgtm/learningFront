// Идентификатор текущего пользователя из JWT (поле `sub`). Подпись здесь не
// проверяется и не должна: токен лежит у самого клиента, сервер проверит его
// при каждом запросе. Нужен только чтобы привязать локальное состояние sync
// к аккаунту — локальная база не очищается при смене пользователя.
import { getToken } from './token';

export function userIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = await getToken();
  return token ? userIdFromToken(token) : null;
}
