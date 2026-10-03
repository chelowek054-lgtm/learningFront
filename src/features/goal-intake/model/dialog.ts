// Логика диалога постановки цели без сети и UI (T-0061): ответы, пересказ, готовность к подтверждению.
import type {
  GoalAnswer,
  GoalQuestion,
  GoalSummary,
  GoalVolume,
  VolumeVariant,
} from '@/shared/api';

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

/** Нужен ли человеку выбор между полным и интуитивным путём: есть базовые области и варианты различаются. */
export function needsChoice(volume: GoalVolume | null): boolean {
  return !!volume && volume.registered && volume.differs === true && !!volume.variants.full;
}

const plural = (n: number, one: string, few: string, many: string): string => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/** «5 областей, около 60 понятий» — с пометкой, если это оценка, а не точный расчёт. */
export function volumeLine(v: VolumeVariant): string {
  const areas = `${v.domainCount} ${plural(v.domainCount, 'область', 'области', 'областей')}`;
  const concepts = `${v.conceptCount} ${plural(v.conceptCount, 'понятие', 'понятия', 'понятий')}`;
  return `${areas}, ${v.precise ? '' : 'около '}${concepts}`;
}
