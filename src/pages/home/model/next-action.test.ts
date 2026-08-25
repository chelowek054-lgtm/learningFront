import { describe, expect, it } from 'vitest';
import type { Course, CourseStep } from '@/shared/api';
import { nextAction, reasonForStep } from './next-action';

const step = (over: Partial<CourseStep> = {}): CourseStep => ({
  conceptId: 'c1',
  title: 'Переобучение',
  tier: 'core',
  bloom: 'understand',
  reason: 'rooting',
  activities: [],
  done: false,
  ...over,
});

const course = (current: CourseStep | null): Course => ({
  domain: 'ml',
  target: { bloom: 'apply', concepts: [] },
  steps: current ? [current] : [],
  completed: 0,
  total: 1,
  current,
});

describe('nextAction', () => {
  it('без предмета отправляет выбирать предмет', () => {
    const a = nextAction({ hasSubject: false, course: course(step()), dueCount: 9 });
    expect(a.kind).toBe('subject');
  });

  it('шаг курса важнее повторений: он двигает вперёд, а не удерживает', () => {
    const a = nextAction({ hasSubject: true, course: course(step()), dueCount: 12 });
    expect(a.kind).toBe('course');
    if (a.kind === 'course') expect(a.step.title).toBe('Переобучение');
  });

  it('без курса, но с просроченными карточками — повторение', () => {
    const a = nextAction({ hasSubject: true, course: null, dueCount: 3 });
    expect(a).toMatchObject({ kind: 'review', dueCount: 3 });
  });

  it('ни курса, ни повторений — определить уровень', () => {
    expect(nextAction({ hasSubject: true, course: null, dueCount: 0 }).kind).toBe('placement');
  });

  it('причина доходит до текста и не остаётся слугом', () => {
    const a = nextAction({
      hasSubject: true,
      course: course(step({ reason: 'branch' })),
      dueCount: 0,
    });
    expect(a.reason).toBe('Это то, ради чего вы начали');
    expect(reasonForStep('differentiation')).toMatch(/перепутать/);
  });
});
