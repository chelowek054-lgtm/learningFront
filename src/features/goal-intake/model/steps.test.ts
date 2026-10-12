import { describe, expect, it } from 'vitest';
import { failureKind, stepLabel, stepOf, STEP_COUNT } from './steps';

describe('шаги онбординга', () => {
  it('всего пять шагов', () => {
    expect(STEP_COUNT).toBe(5);
  });
  it('стадии диалога занимают шаги 1–3', () => {
    expect(stepOf('ask')).toBe(1);
    expect(stepOf('clarify')).toBe(2);
    expect(stepOf('recap')).toBe(3);
    expect(stepOf('volume')).toBe(3);
  });
  it('метка «Шаг N из 5»', () => {
    expect(stepLabel(2)).toBe('Шаг 2 из 5');
  });
  it('сетевая ошибка — «нет сети», остальное — сбой помощника', () => {
    expect(failureKind(true)).toBe('offline');
    expect(failureKind(false)).toBe('model');
  });
});
