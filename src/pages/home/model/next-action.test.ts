import { describe, expect, it } from 'vitest';
import type { Course, CourseStep, ProfileState } from '@/shared/api';
import { cardsWord, nextAction, reasonForStep } from './next-action';

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
    expect(nextAction({ hasSubject: true, course: null, dueCount: 0, graphSize: 32 }).kind).toBe(
      'placement',
    );
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

// ---- состояния предмета (R-0057, V-0108) ----

const NOW = Date.parse('2026-10-07T12:10:00Z');
const profileState = (over: Partial<ProfileState>): ProfileState => ({
  exists: true,
  status: 'building',
  profile: null,
  updatedAt: '2026-10-07T12:00:00Z',
  stale: false,
  ...over,
});
const base = { hasSubject: true, course: null, dueCount: 0, now: NOW };

describe('nextAction по состоянию предмета', () => {
  it('карта собирается: показывает время и важнее курса и повторения', () => {
    const a = nextAction({ ...base, dueCount: 5, build: profileState({}), graphSize: 0 });
    expect(a).toMatchObject({ kind: 'building', minutes: 10 });
  });

  it('сборка не удалась: причина с сервера', () => {
    const a = nextAction({
      ...base,
      build: profileState({ status: 'failed', error: 'модель недоступна' }),
    });
    expect(a).toMatchObject({ kind: 'failed', interrupted: false, reason: 'модель недоступна' });
  });

  it('прерванная сборка отличается от сбоя и предлагает запуск заново', () => {
    const a = nextAction({ ...base, build: profileState({ stale: true }) });
    expect(a).toMatchObject({ kind: 'failed', interrupted: true });
  });

  it('контур ждёт подтверждения', () => {
    expect(nextAction({ ...base, build: profileState({ status: 'outline' }) }).kind).toBe(
      'outline',
    );
  });

  it('карты нет и не строится: предлагает собрать, а не определять уровень', () => {
    expect(nextAction({ ...base, graphSize: 0 }).kind).toBe('build');
    expect(nextAction({ ...base, graphSize: 0, build: null }).kind).not.toBe('placement');
  });

  it('карта готова, курса нет: определить, что знаю', () => {
    const a = nextAction({ ...base, graphSize: 32, build: profileState({ status: 'confirmed' }) });
    expect(a.kind).toBe('placement');
  });

  it('курс пройден целиком: цель достигнута', () => {
    const done: Course = { ...course(null), completed: 7, total: 7 };
    expect(nextAction({ ...base, course: done, graphSize: 32 }).kind).toBe('done');
  });

  it('повторение остаётся, когда нет шага курса и карта готова', () => {
    expect(nextAction({ ...base, dueCount: 2, graphSize: 32 }).kind).toBe('review');
  });
});

describe('nextAction: добавленные состояния и приоритеты', () => {
  it('цель ещё ставится и пауза предмета — свои виды', () => {
    expect(nextAction({ ...base, goalPending: true }).kind).toBe('goal');
    expect(nextAction({ ...base, paused: true, graphSize: 32 }).kind).toBe('paused');
  });

  it('неизвестное состояние — «загружаем», а не «определить уровень»', () => {
    expect(nextAction({ ...base }).kind).toBe('loading');
  });

  it('готовый путь не пропадает из-за сбоя, контура или пересборки', () => {
    const c = course(step());
    for (const status of ['failed', 'outline', 'building'] as const) {
      const a = nextAction({ ...base, course: c, graphSize: 32, build: profileState({ status }) });
      expect(a.kind).toBe('course');
    }
  });

  it('пустая карта не перекрывает повторение', () => {
    expect(nextAction({ ...base, graphSize: 0, dueCount: 3 }).kind).toBe('review');
  });

  it('мусорная метка времени не даёт NaN минут', () => {
    const a = nextAction({ ...base, build: profileState({ updatedAt: 'не дата' }) });
    expect(a).toMatchObject({ kind: 'building', minutes: 0 });
  });
});

describe('cardsWord', () => {
  it('склоняет по числу', () => {
    expect([1, 2, 5, 11, 12, 21, 24, 25].map(cardsWord)).toEqual([
      'карточка',
      'карточки',
      'карточек',
      'карточек',
      'карточек',
      'карточка',
      'карточки',
      'карточек',
    ]);
  });
});
