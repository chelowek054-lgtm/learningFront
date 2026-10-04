// Reading-дрилл (T-0036, R-0022): разбор payload, локальная проверка и таймер.
// Всё чистое: проверка детерминирована и считается без сети мгновенно, а таймер
// выводится из момента старта — поэтому не сбивается, если приложение уходило в фон.
import type { Grade } from '@/shared/engine';
import {
  gradeQuestions,
  isCorrect,
  parseQuestions,
  type QuestionResult,
  type QuestionType,
  type QuizQuestion,
  type QuizResult,
} from '../../../shared/lib/quiz';

export { isCorrect };
export type { QuestionResult, QuestionType };
export type ReadingQuestion = QuizQuestion;
export type ReadingResult = QuizResult;

export interface ReadingDrill {
  title: string;
  passage: string;
  timeLimitSec: number | null;
  questions: ReadingQuestion[];
}

/** payload приходит с сервера как есть: форму проверяем, а не доверяем. */
export function parseReadingDrill(raw: unknown): ReadingDrill | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.passage !== 'string' || !p.passage.trim() || !Array.isArray(p.questions))
    return null;
  const questions = parseQuestions(p.questions as unknown[]);
  if (questions.length === 0) return null;
  return {
    title: typeof p.title === 'string' ? p.title : '',
    passage: p.passage,
    timeLimitSec:
      typeof p.timeLimitSec === 'number' && p.timeLimitSec > 0 ? Math.floor(p.timeLimitSec) : null,
    questions,
  };
}

export function gradeReading(drill: ReadingDrill, answers: Record<string, string>): ReadingResult {
  return gradeQuestions(drill.questions, answers);
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
