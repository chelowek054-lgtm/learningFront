import { describe, expect, it } from 'vitest';
import { hasLocalDraftSignal, writingRubricId } from './rubric';

describe('рубрика письма по типу Activity', () => {
  it('каждый тип письма идёт на свою рубрику', () => {
    expect(writingRubricId('ielts_writing_task2')).toBe('ielts_writing_task2');
    expect(writingRubricId('toefl_writing_independent')).toBe('toefl_writing_independent');
    expect(writingRubricId('toefl_writing_integrated')).toBe('toefl_writing_integrated');
  });

  it('неизвестный тип остаётся на IELTS Task 2, как до появления TOEFL', () => {
    expect(writingRubricId('something_else')).toBe('ielts_writing_task2');
  });

  it('черновой офлайн-сигнал только для IELTS: он считается по критериям IELTS', () => {
    expect(hasLocalDraftSignal('ielts_writing_task2')).toBe(true);
    expect(hasLocalDraftSignal('toefl_writing_independent')).toBe(false);
    expect(hasLocalDraftSignal('toefl_writing_integrated')).toBe(false);
  });
});
