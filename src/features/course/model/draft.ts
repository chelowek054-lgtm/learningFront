// Статус проверки шагов курса (T-0076, R-0044): курс из черновика можно начинать, но человек должен знать, что он не проверен.
import type { Course, CourseStep } from '@/shared/api';

export const isDraft = (step: Pick<CourseStep, 'status'>): boolean => step.status === 'draft';

/** Плашка над курсом; пусто, если все шаги проверены или сервер статусов не прислал. */
export function draftNotice(course: Pick<Course, 'draftSteps' | 'total'>): string {
  const n = course.draftSteps ?? 0;
  if (n <= 0 || course.total <= 0) return '';
  const all = n >= course.total;
  return all
    ? 'Курс собран автоматически и ещё не проверен специалистом. Начинать можно — пометка исчезнет после проверки.'
    : `Курс собран автоматически: ${n} из ${course.total} шагов ещё не проверены специалистом. Начинать можно.`;
}
