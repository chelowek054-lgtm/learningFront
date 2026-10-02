// Самооценка вспоминания → результат от 0 до 1. Ступени те же, что у оценки карточки повторения:
// способ меняется, а шкала освоенности для графа остаётся одной.
export type SelfRating = 'again' | 'hard' | 'good' | 'easy';

export const SELF_RATINGS: { key: SelfRating; label: string; score: number }[] = [
  { key: 'again', label: 'Не вспомнил', score: 0 },
  { key: 'hard', label: 'С трудом', score: 0.4 },
  { key: 'good', label: 'Хорошо', score: 0.8 },
  { key: 'easy', label: 'Легко', score: 1 },
];

export function scoreOf(rating: SelfRating): number {
  const found = SELF_RATINGS.find((r) => r.key === rating);
  if (!found) throw new Error(`Неизвестная самооценка: ${rating}`);
  return found.score;
}

/** Идентификатор способа в свидетельстве: по нему журнал различает технику. */
export const MNEMONIC_SOURCE = 'first_letters';
