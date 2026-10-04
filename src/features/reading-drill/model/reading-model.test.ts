import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  formatClock,
  gradeReading,
  isCorrect,
  parseReadingDrill,
  secondsLeft,
  wrongChoiceIds,
  toGrade,
} from './reading-model';

const RAW = {
  title: 'T',
  passage: 'Some text.',
  timeLimitSec: 600,
  questions: [
    { id: 'q1', type: 'mcq', prompt: 'p', options: ['a', 'b'], answer: 'b' },
    { id: 'q2', type: 'tfng', prompt: 'p', answer: 'not given', explanation: 'нет в тексте' },
    { id: 'q3', type: 'gap', prompt: 'p ____', answer: ['tested', 'checked'] },
  ],
};

describe('parseReadingDrill', () => {
  it('принимает задание и сохраняет вопросы', () => {
    const d = parseReadingDrill(RAW)!;
    expect(d.timeLimitSec).toBe(600);
    expect(d.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('без текста или без вопросов — не задание', () => {
    expect(parseReadingDrill(null)).toBeNull();
    expect(parseReadingDrill({ ...RAW, passage: '  ' })).toBeNull();
    expect(parseReadingDrill({ ...RAW, questions: [] })).toBeNull();
  });

  it('отбрасывает битые и повторяющиеся вопросы, остальное оставляет', () => {
    const d = parseReadingDrill({
      ...RAW,
      questions: [
        ...RAW.questions,
        { id: 'q1', type: 'mcq', prompt: 'дубль', answer: 'x' },
        { id: 'q9', type: 'essay', prompt: 'p', answer: 'x' },
        { id: 'q8', type: 'gap', prompt: 'p', answer: [] },
        { id: 'q7', type: 'gap', prompt: 'p', answer: '' },
        null,
      ],
    })!;
    expect(d.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('время не задано или некорректно — таймера нет', () => {
    expect(parseReadingDrill({ ...RAW, timeLimitSec: 0 })!.timeLimitSec).toBeNull();
    expect(parseReadingDrill({ ...RAW, timeLimitSec: 'x' })!.timeLimitSec).toBeNull();
  });
});

describe('проверка ответов', () => {
  const drill = parseReadingDrill(RAW)!;

  it('считает верные по трём форматам', () => {
    const r = gradeReading(drill, { q1: 'b', q2: 'Not  Given', q3: 'CHECKED' });
    expect(r.correct).toBe(3);
    expect(r.fraction).toBe(1);
  });

  it('пустой и неверный ответ не засчитываются, разбор называет верный', () => {
    const r = gradeReading(drill, { q1: 'a' });
    expect(r.correct).toBe(0);
    expect(r.details[0]).toMatchObject({ correct: false, given: 'a', expected: 'b' });
    expect(r.details[1]).toMatchObject({ given: '', explanation: 'нет в тексте' });
  });

  it('gap принимает любое из допустимых написаний', () => {
    const q = drill.questions[2];
    expect(isCorrect(q, 'tested')).toBe(true);
    expect(isCorrect(q, '  Checked ')).toBe(true);
    expect(isCorrect(q, 'test')).toBe(false);
    expect(isCorrect(q, undefined)).toBe(false);
  });

  it('оценка для журнала: верные из всех, без ошибок для error-log', () => {
    const g = toGrade(gradeReading(drill, { q1: 'b' }), false);
    expect(g).toMatchObject({ rubricId: 'reading_drill', overall: 1, errors: [] });
    expect(g.criteria[0]).toMatchObject({ score: 1, max: 3, comment: '' });
    expect(toGrade(gradeReading(drill, {}), true).criteria[0].comment).toContain('Время вышло');
  });

  it('разбор дистракторов просят только по ошибкам в вопросах с выбором', () => {
    expect(wrongChoiceIds(drill, gradeReading(drill, { q1: 'a', q2: 'x', q3: 'no' }))).toEqual([
      'q1',
    ]);
    expect(wrongChoiceIds(drill, gradeReading(drill, { q1: 'b' }))).toEqual([]);
  });

  it('считает отвеченные', () => {
    expect(answeredCount(drill, { q1: 'a', q2: '  ', q3: 'x' })).toBe(2);
  });
});

describe('таймер', () => {
  it('остаток выводится из момента старта и не уходит ниже нуля', () => {
    expect(secondsLeft(600, 0, 0)).toBe(600);
    expect(secondsLeft(600, 0, 125_900)).toBe(475);
    expect(secondsLeft(600, 0, 9_999_000)).toBe(0);
  });

  it('без лимита таймера нет', () => {
    expect(secondsLeft(null, 0, 1000)).toBeNull();
  });

  it('формат мм:сс', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(475)).toBe('07:55');
    expect(formatClock(3600)).toBe('60:00');
  });
});
