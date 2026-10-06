import { describe, expect, it } from 'vitest';
import { draftNotice, isDraft } from './draft';

describe('статус проверки курса', () => {
  it('шаг-черновик определяется по статусу, а без статуса считается проверенным', () => {
    expect(isDraft({ status: 'draft' })).toBe(true);
    expect(isDraft({ status: 'verified' })).toBe(false);
    expect(isDraft({})).toBe(false);
  });

  it('плашка называет долю непроверенного и не пугает, когда всё проверено', () => {
    expect(draftNotice({ draftSteps: 0, total: 5 })).toBe('');
    expect(draftNotice({ total: 5 })).toBe('');
    expect(draftNotice({ draftSteps: 2, total: 5 })).toContain('2 из 5');
    expect(draftNotice({ draftSteps: 5, total: 5 })).toContain('ещё не проверен');
  });
});
