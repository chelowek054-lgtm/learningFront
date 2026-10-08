import { describe, expect, it } from 'vitest';
import type { GraphEdge, GraphNode, MasteryMap } from '@/shared/api';
import {
  highlightPath,
  isFiltering,
  layoutScheme,
  lookOf,
  masteryStates,
  matches,
  NO_FILTERS,
  scaleOf,
  segmentBetween,
  tagsOf,
  NODE_H,
  NODE_W,
} from './scheme';

const node = (id: string, over: Partial<GraphNode> = {}): GraphNode =>
  ({
    id,
    kind: 'canonical',
    title: id.toUpperCase(),
    centrality: 0,
    stage: 'Основы',
    stageOrder: 1,
    level: 'basic',
    ...over,
  }) as unknown as GraphNode;

const edge = (id: string, from: string, to: string, type = 'prereq'): GraphEdge => ({
  id,
  from,
  to,
  type,
  kind: 'canonical',
});

describe('раскладка по этапам и уровням', () => {
  const nodes = [
    node('m2', { stage: 'Методы', stageOrder: 2, level: 'advanced', title: 'Б' }),
    node('m1', { stage: 'Методы', stageOrder: 2, level: 'basic', title: 'А' }),
    node('o1', { stage: 'Основы', stageOrder: 1 }),
    node('x', { stage: null, stageOrder: null }),
  ];

  it('этапы идут слева направо, без этапа — последним', () => {
    const { columns } = layoutScheme(nodes);
    expect(columns.map((c) => c.title)).toEqual(['Основы', 'Методы', 'Прочее']);
    expect(columns[0].x).toBeLessThan(columns[1].x);
  });

  it('внутри этапа база выше продвинутого', () => {
    const { positions } = layoutScheme(nodes);
    expect(positions.m1.y).toBeLessThan(positions.m2.y);
    expect(positions.m1.x).toBe(positions.m2.x);
  });

  it('свёрнутый этап не занимает места под узлы и сужается', () => {
    const open = layoutScheme(nodes);
    const folded = layoutScheme(nodes, new Set(['Методы']));
    expect(folded.positions.m1).toBeUndefined();
    expect(folded.width).toBeLessThan(open.width);
    expect(folded.columns).toHaveLength(3);
  });
});

describe('состояния освоения и вид узла', () => {
  it('состояния берутся из карты освоенности', () => {
    const map = { nodes: [{ conceptId: 'a', status: 'known' }] } as unknown as MasteryMap;
    expect(masteryStates(map)).toEqual({ a: 'known' });
    expect(masteryStates(null)).toEqual({});
  });

  it('пройденное приглушено, граница подсвечена, закрытое выглядит закрытым', () => {
    const n = node('a');
    expect(lookOf(n, 'known').opacity).toBeLessThan(0.5);
    expect(lookOf(n, 'frontier').emphasis).toBe('frontier');
    expect(lookOf(n, 'locked').emphasis).toBe('locked');
    expect(lookOf(n, undefined)).toMatchObject({ opacity: 1, emphasis: 'none' });
    expect(lookOf(node('b', { optional: true }), undefined).dashed).toBe(true);
  });

  it('подписи — человеческие слова, а не служебные', () => {
    expect(tagsOf(node('a', { level: 'middle', optional: true, reviewStatus: 'draft' }))).toEqual([
      'средний',
      'необязательное',
      'не проверено',
    ]);
    expect(tagsOf(node('b', { kind: 'personal', level: null }))).toEqual(['своё']);
    expect(tagsOf(node('c', { reviewStatus: 'approved', level: null }))).toEqual([]);
  });

  it('центральность — размер, не больше +30%', () => {
    expect(scaleOf(node('a', { centrality: 0 }))).toBe(1);
    expect(scaleOf(node('a', { centrality: 5 }))).toBeCloseTo(1.3);
  });
});

describe('фильтры и поиск', () => {
  const states = { a: 'known', b: 'frontier', c: 'locked' } as const;
  const a = node('a', { title: 'Матрицы' });
  const b = node('b', { title: 'Векторы', optional: true });
  const c = node('c', { kind: 'personal' });

  it('поиск по названию без учёта регистра', () => {
    expect(matches(a, { ...NO_FILTERS, query: 'матр' }, states)).toBe(true);
    expect(matches(b, { ...NO_FILTERS, query: 'матр' }, states)).toBe(false);
  });

  it('«можно изучать сейчас» — граница и изучаемое; «скрыть пройденное» убирает освоенное', () => {
    expect(matches(b, { ...NO_FILTERS, studyNow: true }, states)).toBe(true);
    expect(matches(a, { ...NO_FILTERS, studyNow: true }, states)).toBe(false);
    expect(matches(a, { ...NO_FILTERS, hideKnown: true }, states)).toBe(false);
  });

  it('«только необязательное» и «только своё»', () => {
    expect(matches(b, { ...NO_FILTERS, optionalOnly: true }, states)).toBe(true);
    expect(matches(a, { ...NO_FILTERS, optionalOnly: true }, states)).toBe(false);
    expect(matches(c, { ...NO_FILTERS, mineOnly: true }, states)).toBe(true);
    expect(isFiltering(NO_FILTERS)).toBe(false);
    expect(isFiltering({ ...NO_FILTERS, mineOnly: true })).toBe(true);
  });
});

describe('подсветка пути', () => {
  // r → a → b → c, a → d, z — в стороне
  const edges = [
    edge('1', 'r', 'a'),
    edge('2', 'a', 'b'),
    edge('3', 'b', 'c'),
    edge('4', 'a', 'd'),
    edge('5', 'z', 'a', 'related'),
  ];

  it('предпосылки до корня и то, что открывается', () => {
    const h = highlightPath('b', edges);
    expect([...h.nodes].sort()).toEqual(['a', 'b', 'c', 'r']);
    expect([...h.edges].sort()).toEqual(['1', '2', '3']);
  });

  it('связи не по предпосылкам путь не продолжают', () => {
    expect(highlightPath('z', edges).nodes.size).toBe(1);
  });

  it('цикл в данных не зацикливает подсветку', () => {
    const looped = [edge('1', 'a', 'b'), edge('2', 'b', 'a')];
    expect(highlightPath('a', looped).nodes.size).toBe(2);
  });
});

describe('отрезок для ребра', () => {
  it('горизонтальное ребро идёт без наклона от правой кромки к левой', () => {
    const s = segmentBetween({ x: 0, y: 0 }, { x: NODE_W + 100, y: 0 });
    expect(s.angle).toBeCloseTo(0);
    expect(s.length).toBeCloseTo(100);
    expect(s.top).toBe(NODE_H / 2);
  });
});
