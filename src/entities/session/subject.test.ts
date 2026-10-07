import { describe, expect, it } from 'vitest';
import { nextTarget } from './subject';

describe('следующая ступень цели (T-0106)', () => {
  it('после «понять» — «применить»', () => {
    expect(nextTarget('understand')?.bloom).toBe('apply');
  });

  it('выше «создать» ступени нет', () => {
    expect(nextTarget('create')).toBeNull();
  });
});
