// Какое задание на вспоминание показывать: чистая логика без импортов, чтобы её проверял vitest.

/** Задание из шага курса несёт `item` и идентификаторы понятия и области. */
export function isCourseStepPayload(payload: unknown): boolean {
  const p = (payload ?? {}) as { item?: unknown; domain?: unknown; conceptId?: unknown };
  return Boolean(p.item) && typeof p.domain === 'string' && typeof p.conceptId === 'string';
}
