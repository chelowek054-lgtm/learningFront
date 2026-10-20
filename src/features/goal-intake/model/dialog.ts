// Логика диалога постановки цели без сети и UI (T-0061): ответы, пересказ, готовность к подтверждению.
import type {
  GoalAnswer,
  GoalConstraints,
  GoalQuestion,
  GoalSummary,
  GoalVolume,
  VolumeVariant,
} from '@/shared/api';
import { translate } from '../../../shared/i18n-core';

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
    knows: (next.knows ?? '').trim(),
    constraints: cleanConstraints(next.constraints),
  };
}

/** Часы в неделю из поля ввода: число от 0 (не включая) до 100, иначе не задано. */
export function parseHours(text: string): number | undefined {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : undefined;
}

/** Ограничения без пустых значений: то, что человек не назвал, не хранится. */
export function cleanConstraints(raw: GoalConstraints | undefined): GoalConstraints {
  const out: GoalConstraints = {};
  const deadline = raw?.deadline?.trim();
  const format = raw?.format?.trim();
  if (deadline) out.deadline = deadline;
  if (format) out.format = format;
  if (raw?.hoursPerWeek && raw.hoursPerWeek > 0 && raw.hoursPerWeek <= 100) {
    out.hoursPerWeek = raw.hoursPerWeek;
  }
  return out;
}

const ASSUMED_KEY = {
  goal: 'goal.assumed.goal',
  level: 'goal.assumed.level',
  knows: 'goal.assumed.knows',
  constraints: 'goal.assumed.constraints',
} as const;

/** Какие из пяти полей человек не назвал: по текущим значениям, а не по ответу сервера (он мог устареть после правки). */
export function assumedFields(summary: GoalSummary, levelChosen: boolean): string[] {
  const out: string[] = [];
  if (!summary.goal.trim() || summary.goal.trim() === summary.area.trim()) out.push('goal');
  if (!levelChosen) out.push('level');
  if (!(summary.knows ?? '').trim()) out.push('knows');
  if (Object.keys(cleanConstraints(summary.constraints)).length === 0) out.push('constraints');
  return out;
}

/** «Не указано, предположили: …» для экрана пересказа; пусто, если всё названо. */
export function assumedLine(fields: string[]): string {
  if (fields.length === 0) return '';
  const names = fields.map((f) =>
    f in ASSUMED_KEY ? translate(ASSUMED_KEY[f as keyof typeof ASSUMED_KEY]) : f,
  );
  return translate('goal.assumedLine', { fields: names.join(', ') });
}

/** Пересказ для строки подтверждения: «область X, цель Y». */
export function recapLine(summary: GoalSummary): string {
  const goal =
    summary.goal && summary.goal !== summary.area
      ? translate('goal.line.goal', { goal: summary.goal })
      : '';
  const knows = summary.knows ? translate('goal.line.knows', { knows: summary.knows }) : '';
  const c = summary.constraints ?? {};
  const limits = [
    c.deadline ? translate('goal.line.deadline', { deadline: c.deadline }) : '',
    c.hoursPerWeek ? translate('goal.line.hours', { hours: c.hoursPerWeek }) : '',
    c.format ? translate('goal.line.format', { format: c.format }) : '',
  ].filter((x) => x !== '');
  const tail = limits.length ? translate('goal.line.limits', { limits: limits.join(', ') }) : '';
  return `${translate('goal.line.area', { area: summary.area })}${goal}${knows}${tail}`;
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

/** «5 областей, около 60 понятий» — с пометкой, если это оценка, а не точный расчёт. */
export function volumeLine(v: VolumeVariant): string {
  const areas = translate('plural.areas', { count: v.domainCount });
  const concepts = translate('plural.concepts', { count: v.conceptCount });
  return `${areas}, ${v.precise ? '' : translate('goal.volume.about')}${concepts}`;
}

/** Поля прямой формы (без сети) в виде, который хранится в профиле: пустое не попадает. */
export function directIntake(raw: {
  goal: string;
  knows: string;
  deadline: string;
  hours: string;
  format: string;
}): { goal?: string; knows?: string; constraints?: GoalConstraints } {
  const constraints = cleanConstraints({
    deadline: raw.deadline,
    format: raw.format,
    hoursPerWeek: parseHours(raw.hours),
  });
  const out: { goal?: string; knows?: string; constraints?: GoalConstraints } = {};
  if (raw.goal.trim()) out.goal = raw.goal.trim();
  if (raw.knows.trim()) out.knows = raw.knows.trim();
  if (Object.keys(constraints).length > 0) out.constraints = constraints;
  return out;
}
