import { translate } from '../../../shared/i18n-core';
// Самооценка вспоминания → результат от 0 до 1. Ступени те же, что у оценки карточки повторения:
// способ меняется, а шкала освоенности для графа остаётся одной.
export type SelfRating = 'again' | 'hard' | 'good' | 'easy';

export const SELF_RATINGS: { key: SelfRating; label: string; score: number }[] = [
  {
    key: 'again',
    get label() {
      return translate('mnemonicRecallRating.1');
    },
    score: 0,
  },
  {
    key: 'hard',
    get label() {
      return translate('mnemonicRecallRating.2');
    },
    score: 0.4,
  },
  {
    key: 'good',
    get label() {
      return translate('mnemonicRecallRating.3');
    },
    score: 0.8,
  },
  {
    key: 'easy',
    get label() {
      return translate('mnemonicRecallRating.4');
    },
    score: 1,
  },
];

export function scoreOf(rating: SelfRating): number {
  const found = SELF_RATINGS.find((r) => r.key === rating);
  if (!found) throw new Error(translate('mnemonicRecallRating.5', { rating }));
  return found.score;
}

/** Идентификатор способа в свидетельстве: по нему журнал различает технику. */
export const MNEMONIC_SOURCE = 'first_letters';
