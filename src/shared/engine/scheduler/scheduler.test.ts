import { describe, expect, it } from 'vitest';
import { createScheduler } from './scheduler';

describe('Scheduler (FSRS)', () => {
  const now = new Date('2026-07-04T00:00:00.000Z');

  it('создаёт новую карточку', () => {
    const s = createScheduler();
    const card = s.createCard(now);
    expect(card.reps).toBe(0);
    expect(card.due.getTime()).toBe(now.getTime());
  });

  it('отзыв "good" отодвигает срок и увеличивает reps', () => {
    const s = createScheduler();
    const card = s.createCard(now);
    const { card: next, dueAt } = s.review(card, 'good', now);
    expect(next.reps).toBe(1);
    expect(dueAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('dueCards возвращает только карточки с наступившим сроком', () => {
    const s = createScheduler();
    const due = s.createCard(now); // due = now
    const later = s.review(s.createCard(now), 'easy', now).card; // due далеко в будущем
    const result = s.dueCards([due, later], now);
    expect(result).toContain(due);
    expect(result).not.toContain(later);
  });
});
