// Reading-дрилл (T-0036, R-0022): разбор payload, локальная проверка и таймер.
// Всё чистое: проверка детерминирована и считается без сети мгновенно, а таймер
// выводится из момента старта — поэтому не сбивается, если приложение уходило в фон.
import type { Grade } from '@/shared/engine';

export type QuestionType = 'mcq' | 'tfng' | 'gap';

export interface ReadingQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  /** Для gap — несколько допустимых написаний. */
  answer: string | string[];
  explanation?: string;
}

export interface ReadingDrill {
  title: string;
  passage: string;
  timeLimitSec: number | null;
  questions: ReadingQuestion[];
}

const TYPES: QuestionType[] = ['mcq', 'tfng', 'gap'];

/** payload приходит с сервера как есть: форму проверяем, а не доверяем. */
export function parseReadingDrill(raw: unknown): ReadingDrill | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.passage !== 'string' || !p.passage.trim() || !Array.isArray(p.questions))
    return null;
  const seen = new Set<string>();
  const questions: ReadingQuestion[] = [];
  for (const q of p.questions as Record<string, unknown>[]) {
    if (!q || typeof q.id !== 'string' || seen.has(q.id)) continue;
    if (!TYPES.includes(q.type as QuestionType) || typeof q.prompt !== 'string') continue;
    const answer = q.answer;
    const okAnswer =
      typeof answer === 'string' ||
      (Array.isArray(answer) && answer.every((a) => typeof a === 'string'));
    if (!okAnswer || (Array.isArray(answer) && answer.length === 0) || answer === '') continue;
    seen.add(q.id);
    questions.push({
      id: q.id,
      type: q.type as QuestionType,
      prompt: q.prompt,
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      answer: answer as string | string[],
      explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
    });
  }
  if (questions.length === 0) return null;
  return {
    title: typeof p.title === 'string' ? p.title : '',
    passage: p.passage,
    timeLimitSec:
      typeof p.timeLimitSec === 'number' && p.timeLimitSec > 0 ? Math.floor(p.timeLimitSec) : null,
    questions,
  };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Ответ верен: для gap — любое из допустимых написаний, без учёта регистра и лишних пробелов. */
export function isCorrect(q: ReadingQuestion, given: string | undefined): boolean {
  if (given === undefined || !given.trim()) return false;
  const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
  return accepted.some((a) => norm(a) === norm(given));
}

export interface QuestionResult {
  id: string;
  correct: boolean;
  given: string;
  expected: string;
  explanation?: string;
}

export interface ReadingResult {
  correct: number;
  total: number;
  /** Доля верных, 0..1. */
  fraction: number;
  details: QuestionResult[];
}

export function gradeReading(drill: ReadingDrill, answers: Record<string, string>): ReadingResult {
  const details = drill.questions.map((q) => ({
    id: q.id,
    correct: isCorrect(q, answers[q.id]),
    given: answers[q.id] ?? '',
    expected: Array.isArray(q.answer) ? q.answer[0] : q.answer,
    explanation: q.explanation,
  }));
  const correct = details.filter((d) => d.correct).length;
  return { correct, total: details.length, fraction: correct / details.length, details };
}

/** Результат в общем виде оценки: он попадает в журнал ответов и в метрики прогресса. */
export function toGrade(result: ReadingResult, timedOut: boolean): Grade {
  return {
    rubricId: 'reading_drill',
    rubricVersion: 1,
    criteria: [
      {
        name: 'Верных ответов',
        score: result.correct,
        max: result.total,
        comment: timedOut ? 'Время вышло: засчитано отвеченное.' : '',
      },
    ],
    overall: result.correct,
    errors: [],
  };
}

// ---- таймер ----

/** Сколько секунд осталось; null — времени на задание не дано. */
export function secondsLeft(
  limitSec: number | null,
  startedAtMs: number,
  nowMs: number,
): number | null {
  if (limitSec === null) return null;
  return Math.max(0, limitSec - Math.floor((nowMs - startedAtMs) / 1000));
}

export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Вопросов с ответом: по нему экран предупреждает, что что-то осталось пустым. */
export function answeredCount(drill: ReadingDrill, answers: Record<string, string>): number {
  return drill.questions.filter((q) => (answers[q.id] ?? '').trim() !== '').length;
}

/** Вопросы с выбором, на которых ошиблись: для них при сети просят разбор дистракторов. */
export function wrongChoiceIds(drill: ReadingDrill, result: ReadingResult): string[] {
  const wrong = new Set(result.details.filter((d) => !d.correct).map((d) => d.id));
  return drill.questions.filter((q) => q.type === 'mcq' && wrong.has(q.id)).map((q) => q.id);
}
