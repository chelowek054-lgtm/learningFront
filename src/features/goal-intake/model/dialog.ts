// Логика диалога постановки цели без сети и UI (T-0061): ответы, пересказ, готовность к подтверждению.
import type {
  GoalAnswer,
  GoalConstraints,
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

const ASSUMED_LABEL: Record<string, string> = {
  goal: 'зачем это нужно',
  level: 'до какого уровня',
  knows: 'что уже знаете',
  constraints: 'срок и время на занятия',
};

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
  return `Не указано, предположили: ${fields.map((f) => ASSUMED_LABEL[f] ?? f).join(', ')}.`;
}

/** Пересказ для строки подтверждения: «область X, цель Y». */
export function recapLine(summary: GoalSummary): string {
  const goal = summary.goal && summary.goal !== summary.area ? `, цель — ${summary.goal}` : '';
  const knows = summary.knows ? `, уже знаете: ${summary.knows}` : '';
  const c = summary.constraints ?? {};
  const limits = [
    c.deadline ? `срок ${c.deadline}` : '',
    c.hoursPerWeek ? `${c.hoursPerWeek} ч в неделю` : '',
    c.format ? `формат: ${c.format}` : '',
  ].filter((x) => x !== '');
  const tail = limits.length ? `, ограничения: ${limits.join(', ')}` : '';
  return `область «${summary.area}»${goal}${knows}${tail}`;
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
