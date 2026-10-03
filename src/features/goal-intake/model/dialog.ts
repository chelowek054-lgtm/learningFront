// Логика диалога постановки цели без сети и UI (T-0061): ответы, пересказ, готовность к подтверждению.
import type { GoalAnswer, GoalQuestion, GoalSummary } from '@/shared/api';

/** Свободный ввод достаточно содержателен, чтобы задавать по нему вопросы. */
export const canAsk = (text: string): boolean => text.trim().length > 1;

/** Ответы по вопросам; пустое поле — пропуск, а не пустой ответ. */
export function collectAnswers(
  questions: GoalQuestion[],
  values: Record<string, string>,
): GoalAnswer[] {
  return questions.map((q) => {
    const value = (values[q.id] ?? '').trim();
    return { question: q.text, answer: value === '' ? null : value };
  });
}

export const answeredCount = (answers: GoalAnswer[]): number =>
  answers.filter((a) => a.answer !== null).length;

/** Область и цель должны быть названы: иначе подтверждать нечего. */
export const canConfirm = (summary: GoalSummary): boolean => summary.area.trim().length > 1;

/** Правка пересказа человеком перед подтверждением: пустых пожеланий не остаётся. */
export function editSummary(summary: GoalSummary, patch: Partial<GoalSummary>): GoalSummary {
  const next = { ...summary, ...patch };
  return {
    area: next.area.trim(),
    goal: next.goal.trim() || next.area.trim(),
    level: next.level,
    wishes: next.wishes.map((w) => w.trim()).filter((w) => w !== ''),
  };
}

/** Пересказ для строки подтверждения: «область X, цель Y». */
export function recapLine(summary: GoalSummary): string {
  const goal = summary.goal && summary.goal !== summary.area ? `, цель — ${summary.goal}` : '';
  return `область «${summary.area}»${goal}`;
}

/** Из подтверждённого пересказа получается предмет профиля; идентификатор считает вызывающий. */
export function subjectOf(
  summary: GoalSummary,
  toId: (title: string) => string,
): { id: string; title: string; target: string } {
  return { id: toId(summary.area), title: summary.area, target: summary.level };
}
