import { describe, expect, it } from 'vitest';
import { isCourseStepPayload } from './recall-renderer';

describe('какое задание на вспоминание показывать', () => {
  it('шаг курса: есть вопрос в item и идентификаторы понятия', () => {
    expect(
      isCourseStepPayload({ domain: 'ml', conceptId: 'c1', item: { prompt: 'Что такое…?' } }),
    ).toBe(true);
  });

  it('самостоятельное задание: вопрос лежит в prompt, item нет', () => {
    expect(isCourseStepPayload({ prompt: 'Объясните…' })).toBe(false);
    expect(isCourseStepPayload(undefined)).toBe(false);
  });

  it('item без понятия не годится для шага: оценить ответ было бы некуда', () => {
    expect(isCourseStepPayload({ item: { prompt: 'x' } })).toBe(false);
  });
});
