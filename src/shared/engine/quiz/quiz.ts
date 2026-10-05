// Вопросы с проверкой ответа: общая часть дриллов чтения и аудирования (R-0022).
// Проверка детерминирована и считается без сети.

export type QuestionType = 'mcq' | 'tfng' | 'gap';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  /** Для gap — несколько допустимых написаний. */
  answer: string | string[];
  explanation?: string;
}

const TYPES: QuestionType[] = ['mcq', 'tfng', 'gap'];

/** Вопросы из payload: форму проверяем, повторы id и негодные отбрасываем. */
export function parseQuestions(raw: unknown[]): QuizQuestion[] {
  const seen = new Set<string>();
  const questions: QuizQuestion[] = [];
  for (const q of raw as Record<string, unknown>[]) {
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
  return questions;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Ответ верен: для gap — любое из допустимых написаний, без учёта регистра и лишних пробелов. */
export function isCorrect(q: QuizQuestion, given: string | undefined): boolean {
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

export interface QuizResult {
  correct: number;
  total: number;
  /** Доля верных, 0..1. */
  fraction: number;
  details: QuestionResult[];
}

export function gradeQuestions(
  questions: QuizQuestion[],
  answers: Record<string, string>,
): QuizResult {
  const details = questions.map((q) => ({
    id: q.id,
    correct: isCorrect(q, answers[q.id]),
    given: answers[q.id] ?? '',
    expected: Array.isArray(q.answer) ? q.answer[0] : q.answer,
    explanation: q.explanation,
  }));
  const correct = details.filter((d) => d.correct).length;
  return { correct, total: details.length, fraction: correct / details.length, details };
}
