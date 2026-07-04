// Тонкая обёртка над ts-fsrs. Работает офлайн, на клиенте. См. 02-logical.md §4.
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating as FsrsRating,
  type Card,
  type FSRSParameters,
  type Grade as FsrsGrade,
} from 'ts-fsrs';

/** Отзыв пользователя на карточку. */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

/** Сериализуемое состояние карточки FSRS (хранится в srs_card.fsrs_state). */
export type FsrsCardState = Card;

const RATING_MAP: Record<Rating, FsrsGrade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

export interface Scheduler {
  /** Новая карточка (state=New). */
  createCard(now?: Date): FsrsCardState;
  /** Пересчёт после отзыва: новое состояние + срок следующего показа. */
  review(card: FsrsCardState, rating: Rating, now?: Date): { card: FsrsCardState; dueAt: Date };
  /** Карточки, срок которых наступил (due <= now). */
  dueCards(cards: readonly FsrsCardState[], now?: Date): FsrsCardState[];
}

export function createScheduler(params?: Partial<FSRSParameters>): Scheduler {
  const engine = fsrs(generatorParameters(params));
  return {
    createCard(now = new Date()) {
      return createEmptyCard(now);
    },
    review(card, rating, now = new Date()) {
      const { card: next } = engine.next(card, now, RATING_MAP[rating]);
      return { card: next, dueAt: next.due };
    },
    dueCards(cards, now = new Date()) {
      const t = now.getTime();
      return cards.filter((c) => c.due.getTime() <= t);
    },
  };
}
