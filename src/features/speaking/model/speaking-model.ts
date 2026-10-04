// Устный ответ (T-0040, T-0042): разбор задания и правила записи. Чистая логика, без звука.

export const DEFAULT_MAX_SEC = 120;
/** Запись короче этого не отправляем: в ней заведомо нет ответа. */
export const MIN_SEC = 3;

export interface SpeakingTask {
  prompt: string;
  maxSec: number;
}

export function parseSpeakingTask(raw: unknown): SpeakingTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.prompt !== 'string' || !p.prompt.trim()) return null;
  const max = typeof p.maxSec === 'number' ? Math.floor(p.maxSec) : DEFAULT_MAX_SEC;
  return { prompt: p.prompt, maxSec: max >= MIN_SEC ? max : DEFAULT_MAX_SEC };
}

/** Можно ли отправить запись длиной `sec` секунд; иначе — понятная причина. */
export function sendBlocker(sec: number): string | null {
  return sec < MIN_SEC ? 'Запись слишком короткая: ответьте подробнее и запишите ещё раз.' : null;
}

export const formatSec = (sec: number): string =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
