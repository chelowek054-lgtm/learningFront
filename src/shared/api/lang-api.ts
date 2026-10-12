// Язык человека на сервере: язык интерфейса и язык изучения (T-0174, T-0179).
// Сервер по ним отдаёт теорию, названия, задания, уведомления и письма на нужном языке.
import type { AuthUser } from './auth-api';
import { api } from './http';

/** Присланное поле меняется, `null` его убирает, отсутствующее остаётся как было. */
export interface LangSettings {
  studyLang?: string | null;
  uiLang?: string | null;
}

export const saveLangs = (settings: LangSettings) =>
  api<AuthUser>('/auth/me/lang', { method: 'PUT', body: JSON.stringify(settings) });
