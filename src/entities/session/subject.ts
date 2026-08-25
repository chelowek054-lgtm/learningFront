// Предмет изучения — то, что человек выбрал в онбординге.
//
// Раньше область была зашита строкой 'ml' в четырёх экранах, из-за чего
// приложение, обещающее «любую базу знаний», работало ровно в одной. Здесь
// единственный источник: экраны спрашивают предмет, а не объявляют его.

/**
 * Уровень владения. `label` — формулировка от лица человека («решу задачу»),
 * `short` — короткое имя ступени для мест, где нужна одна строка.
 *
 * Единственный источник: раньше этот список существовал в трёх экранах в трёх
 * несовпадающих видах, а кое-где наружу выходил английский слуг Блума.
 */
export const MASTERY_TARGETS = [
  { bloom: 'remember', short: 'Вспомнить', label: 'узнаю термины' },
  { bloom: 'understand', short: 'Понять', label: 'объясню своими словами' },
  { bloom: 'apply', short: 'Применить', label: 'решу задачу' },
  { bloom: 'create', short: 'Создать', label: 'построю своё' },
] as const;

export type TargetBloom = (typeof MASTERY_TARGETS)[number]['bloom'];

export interface Subject {
  /** Идентификатор области для backend. Уходит в путь URL — кодировать. */
  id: string;
  /** Как человек назвал предмет. */
  title: string;
  /** До какого уровня хочет дойти. */
  target: TargetBloom;
}

/**
 * Slug из названия. Юникод не выбрасываем: «Теория музыки» должна остаться
 * узнаваемой в URL и в БД, а не превратиться в subject-4f2a. Кодирование при
 * подстановке в путь — забота слоя api.
 */
export function toSubjectId(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function targetLabel(bloom: string): string {
  return MASTERY_TARGETS.find((t) => t.bloom === bloom)?.label ?? bloom;
}

/** Профиль хранит произвольный JSON — читаем бережно, без доверия форме. */
export function readSubject(profile: Record<string, unknown> | undefined): Subject | null {
  const raw = profile?.subject as Partial<Subject> | undefined;
  if (!raw?.id || !raw.title) return null;
  const target = MASTERY_TARGETS.some((t) => t.bloom === raw.target)
    ? (raw.target as TargetBloom)
    : 'understand';
  return { id: raw.id, title: raw.title, target };
}
