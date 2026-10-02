// Способы изучения (T-0053, T-0063): что можно выбрать и что выбрано.
import { api } from './http';

/** Способ, который предлагает модуль; `purpose` — шаг изучения, который он исполняет. */
export interface StudyMethodOption {
  id: string;
  title: string;
  purpose: string;
  activityType: string;
  offline: boolean;
  module: string;
  inCourse: boolean;
}

export interface StudyMethodChoice {
  /** Выбор человека: {шаг: id способа}. Пусто — всё по умолчанию. */
  preferred: Record<string, string>;
  options: StudyMethodOption[];
}

export const getStudyMethods = () => api<StudyMethodChoice>('/me/study-methods');

/** `method: null` возвращает способ по умолчанию. Сервер пересобирает курс; освоенность не трогает. */
export const setStudyMethod = (purpose: string, method: string | null) =>
  api<StudyMethodChoice>('/me/study-methods', {
    method: 'PUT',
    body: JSON.stringify({ purpose, method }),
  });
