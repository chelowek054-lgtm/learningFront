import { describe, expect, it } from 'vitest';
import type { Grade, Response, SrsCardRecord } from '../../../shared/engine';
import { errorLogClosure, knownShare, retention, rubricGrowth, streakDays } from './metrics';

const card = (
  fsrsState: Record<string, unknown>,
  source: SrsCardRecord['source'] = 'awl',
): SrsCardRecord => ({
  id: Math.random().toString(),
  userId: 'u',
  module: 'languages',
  front: {},
  back: {},
  source,
  fsrsState,
  dueAt: '2026-10-01T00:00:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
});

const grade = (rubricId: string, overall: number, scores: number[] = []): Grade => ({
  rubricId,
  rubricVersion: 1,
  overall,
  criteria: scores.map((s, i) => ({ name: `C${i}`, score: s, max: 9, comment: '' })),
  errors: [],
});

const response = (at: string, g: Grade | null): Response => ({
  id: at + (g?.rubricId ?? ''),
  activityId: 'a',
  userId: 'u',
  userAnswer: 'x',
  grade: g,
  localCreatedAt: at,
  synced: true,
});

describe('retention', () => {
  it('доля повторений без срыва по счётчикам FSRS', () => {
    const r = retention([card({ reps: 8, lapses: 2 }), card({ reps: 2, lapses: 0 })]);
    expect(r).toEqual({ reviews: 10, lapses: 2, rate: 0.8 });
  });

  it('без повторений доли нет, а не ноль', () => {
    expect(retention([card({ reps: 0, lapses: 0 }), card({})]).rate).toBeNull();
    expect(retention([]).rate).toBeNull();
  });

  it('срывов не может быть больше повторений', () => {
    expect(retention([card({ reps: 1, lapses: 3 })]).rate).toBe(0);
  });
});

describe('errorLogClosure', () => {
  it('считает закреплёнными карточки ошибок в обзоре с двумя и более повторениями', () => {
    const r = errorLogClosure([
      card({ state: 2, reps: 3 }, 'error_log'),
      card({ state: 1, reps: 1 }, 'error_log'),
      card({ state: 0, reps: 0 }, 'error_log'),
      card({ state: 2, reps: 9 }, 'awl'), // не из ошибок
    ]);
    expect(r).toEqual({ total: 3, settled: 1, rate: 1 / 3 });
  });

  it('без ошибок доли нет', () => {
    expect(errorLogClosure([card({ state: 2, reps: 5 })]).rate).toBeNull();
  });
});

describe('rubricGrowth', () => {
  it('сравнивает первую и последнюю работу по рубрике, в том числе по критериям', () => {
    const [g] = rubricGrowth([
      response('2026-09-03T10:00:00Z', grade('r', 6.5, [6, 7])),
      response('2026-09-01T10:00:00Z', grade('r', 5, [5, 5])),
      response('2026-09-02T10:00:00Z', grade('r', 5.5, [5, 6])),
    ]);
    expect(g.count).toBe(3);
    expect(g.first).toBe(5);
    expect(g.last).toBe(6.5);
    expect(g.delta).toBe(1.5);
    expect(g.criteria.map((c) => [c.name, c.delta])).toEqual([
      ['C0', 1],
      ['C1', 2],
    ]);
  });

  it('одна работа — динамики ещё нет', () => {
    const [g] = rubricGrowth([response('2026-09-01T10:00:00Z', grade('r', 5, [5]))]);
    expect(g.delta).toBeNull();
    expect(g.criteria).toEqual([]);
  });

  it('рубрики считаются раздельно, неоценённые и черновые работы не учитываются', () => {
    const draft: Grade = { ...grade('r', 9), gradedOfflineFallback: true };
    const growth = rubricGrowth([
      response('2026-09-01T10:00:00Z', grade('a', 5)),
      response('2026-09-02T10:00:00Z', grade('b', 4)),
      response('2026-09-03T10:00:00Z', null),
      response('2026-09-04T10:00:00Z', draft),
    ]);
    expect(growth.map((g) => g.rubricId).sort()).toEqual(['a', 'b']);
  });
});

describe('knownShare', () => {
  it('доля known среди узлов карты', () => {
    const s = knownShare({
      nodes: [
        { status: 'known' },
        { status: 'known' },
        { status: 'frontier' },
        { status: 'locked' },
      ],
    });
    expect(s).toEqual({ known: 2, total: 4, rate: 0.5 });
  });

  it('нет карты или она пуста — данных нет', () => {
    expect(knownShare(null)).toBeNull();
    expect(knownShare({ nodes: [] })).toBeNull();
  });
});

describe('streakDays', () => {
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();
  const now = new Date(2026, 9, 10, 18);

  it('считает подряд идущие дни до сегодня включительно', () => {
    const r = [
      response(at(2026, 10, 10), null),
      response(at(2026, 10, 9), null),
      response(at(2026, 10, 8), null),
    ];
    expect(streakDays(r, now)).toBe(3);
  });

  it('серия не прервана, пока сегодня ещё не занимались, но вчера занимались', () => {
    expect(
      streakDays([response(at(2026, 10, 9), null), response(at(2026, 10, 8), null)], now),
    ).toBe(2);
  });

  it('пропущенный день обрывает серию', () => {
    expect(
      streakDays([response(at(2026, 10, 10), null), response(at(2026, 10, 8), null)], now),
    ).toBe(1);
    expect(streakDays([response(at(2026, 10, 7), null)], now)).toBe(0);
  });

  it('несколько ответов за день — один день', () => {
    expect(
      streakDays([response(at(2026, 10, 10), null), response(at(2026, 10, 10) + '', null)], now),
    ).toBe(1);
  });
});
