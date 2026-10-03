import { describe, expect, it } from 'vitest';
import { compareCardStates, serverVersionWins } from './card-merge';

const s = (last_review?: string, reps = 0, lapses = 0) => ({
  reps,
  lapses,
  ...(last_review ? { last_review } : {}),
});

describe('слияние карточки по последнему ревью', () => {
  it('побеждает более позднее ревью', () => {
    expect(serverVersionWins(s('2026-10-01T10:00:00Z', 3), s('2026-10-02T10:00:00Z', 4))).toBe(
      true,
    );
    expect(serverVersionWins(s('2026-10-02T10:00:00Z', 4), s('2026-10-01T10:00:00Z', 3))).toBe(
      false,
    );
  });

  it('ревьюированная карточка сильнее новой, новая — никогда сильнее', () => {
    expect(serverVersionWins(s(), s('2026-10-01T10:00:00Z', 1))).toBe(true);
    expect(serverVersionWins(s('2026-10-01T10:00:00Z', 1), s())).toBe(false);
  });

  it('при том же времени решают повторы, затем провалы', () => {
    const t = '2026-10-01T10:00:00Z';
    expect(compareCardStates(s(t, 5), s(t, 4))).toBeGreaterThan(0);
    expect(compareCardStates(s(t, 5, 2), s(t, 5, 1))).toBeGreaterThan(0);
  });

  it('одинаковые состояния не заменяют друг друга', () => {
    expect(serverVersionWins(s('2026-10-01T10:00:00Z', 3), s('2026-10-01T10:00:00Z', 3))).toBe(
      false,
    );
  });

  it('время без зоны читается как UTC, мусор вместо даты проигрывает', () => {
    expect(serverVersionWins(s('2026-10-01T10:00:00Z', 1), s('2026-10-02T10:00:00', 2))).toBe(true);
    expect(serverVersionWins(s('2026-10-01T10:00:00Z', 1), s('вчера', 9))).toBe(false);
  });

  it('пустое состояние не ломает сравнение', () => {
    expect(compareCardStates(null, undefined)).toBe(0);
    expect(serverVersionWins(null, s('2026-10-01T10:00:00Z', 1))).toBe(true);
  });
});
