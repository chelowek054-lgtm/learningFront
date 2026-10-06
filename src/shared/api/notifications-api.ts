// Уведомления о курсе (T-0083): «курс готов» и «курс дополнен» с пометкой о непроверенном.
import { api } from './http';

export interface CourseNotification {
  id: string;
  kind: 'course_ready' | 'course_extended';
  domain: string;
  title: string;
  body: string;
  data: { steps?: number; drafts?: number; added?: number };
  createdAt: string | null;
  read: boolean;
}

/** Непрочитанные уведомления человека. */
export const listNotifications = () => api<CourseNotification[]>('/graph/notifications');

/** Отметить прочитанными: список id или все (без аргумента). */
export const markNotificationsRead = (ids?: string[]) =>
  api<{ marked: number }>('/graph/notifications/read', {
    method: 'POST',
    body: JSON.stringify(ids ? { ids } : {}),
  });
