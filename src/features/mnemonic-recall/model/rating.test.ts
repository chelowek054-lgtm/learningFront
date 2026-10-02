import { describe, expect, it } from 'vitest';
import { SELF_RATINGS, scoreOf } from './rating';

describe('самооценка вспоминания', () => {
  it('шкала идёт от провала к полному владению без разрывов вниз', () => {
    const scores = SELF_RATINGS.map((r) => r.score);
    expect(scores[0]).toBe(0);
    expect(scores[scores.length - 1]).toBe(1);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  it('результат лежит в границах, которые принимает сервер', () => {
    for (const r of SELF_RATINGS) {
      expect(scoreOf(r.key)).toBeGreaterThanOrEqual(0);
      expect(scoreOf(r.key)).toBeLessThanOrEqual(1);
    }
  });

  it('неизвестная оценка отвергается, а не превращается в ноль', () => {
    expect(() => scoreOf('meh' as never)).toThrow();
  });
});
