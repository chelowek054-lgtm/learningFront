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
  fitZoom,
  jitterOf,
  laneYs,
  routeEdge,
  type Bar,
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
      'не проверено куратором',
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

describe('рёбра ломаными', () => {
  const grid = (cols: number, rows: number) => {
    const nodes: GraphNode[] = [];
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++)
        nodes.push(node(`n${c}${r}`, { stage: `Э${c}`, stageOrder: c, title: `Т${c}${r}` }));
    return nodes;
  };
  const rects = (layout: ReturnType<typeof layoutScheme>) =>
    Object.entries(layout.positions).map(([id, p]) => ({ id, ...p }));
  const hits = (bar: Bar, n: { x: number; y: number }) =>
    bar.left < n.x + NODE_W &&
    bar.left + bar.width > n.x &&
    bar.top < n.y + NODE_H &&
    bar.top + bar.height > n.y;

  it('соседние колонки: ломаная из трёх отрезков, острие у левой кромки цели', () => {
    const layout = layoutScheme(grid(2, 2));
    const r = routeEdge(layout.positions.n00!, layout.positions.n11!, laneYs(layout));
    expect(r.bars).toHaveLength(3);
    expect(r.arrow).toEqual({
      x: layout.positions.n11!.x,
      y: layout.positions.n11!.y + NODE_H / 2,
      dir: 'right',
    });
  });

  it('связь через колонку не задевает ни одного узла', () => {
    const layout = layoutScheme(grid(3, 3));
    const lanes = laneYs(layout);
    const pairs: [string, string][] = [
      ['n00', 'n20'],
      ['n01', 'n21'],
      ['n02', 'n20'],
      ['n00', 'n22'],
    ];
    for (const [from, to] of pairs) {
      const r = routeEdge(
        layout.positions[from]!,
        layout.positions[to]!,
        lanes,
        jitterOf(from + to),
      );
      for (const bar of r.bars)
        for (const n of rects(layout))
          expect(hits(bar, n), `${from}→${to} задевает ${n.id}`).toBe(false);
    }
  });

  it('связь в одной колонке идёт вдоль правой кромки и не задевает узлы', () => {
    const layout = layoutScheme(grid(1, 3));
    const r = routeEdge(layout.positions.n00!, layout.positions.n02!, laneYs(layout));
    expect(r.arrow.dir).toBe('left');
    for (const bar of r.bars) for (const n of rects(layout)) expect(hits(bar, n)).toBe(false);
  });

  it('ребро назад огибает по дорожке и не задевает узлы', () => {
    const layout = layoutScheme(grid(3, 3));
    const r = routeEdge(layout.positions.n21!, layout.positions.n01!, laneYs(layout));
    for (const bar of r.bars) for (const n of rects(layout)) expect(hits(bar, n)).toBe(false);
  });

  it('сдвиг канала зависит от номера ребра и невелик', () => {
    expect(jitterOf('e1')).toBe(jitterOf('e1'));
    for (const id of ['a', 'bb', 'ccc', 'e17'])
      expect(Math.abs(jitterOf(id))).toBeLessThanOrEqual(8);
  });

  it('этапы разных областей с одним названием остаются разными колонками, область — отдельной подписью', () => {
    const nodes = [
      node('p', { area: 'Вероятность', stage: 'Основы', stageOrder: 1 }),
      node('l', { area: 'Линейная алгебра', stage: 'Основы', stageOrder: 101 }),
    ];
    const { columns } = layoutScheme(nodes);
    expect(columns).toHaveLength(2);
    expect(columns.map((c) => c.title)).toEqual(['Основы', 'Основы']);
    expect(columns.map((c) => c.area)).toEqual(['Вероятность', 'Линейная алгебра']);
  });
});

describe('подсветка до и после', () => {
  const e = (id: string, from: string, to: string): GraphEdge =>
    ({ id, from, to, type: 'prereq', kind: 'canonical' }) as GraphEdge;
  it('делит соседей на «нужно раньше» и «открывает»', () => {
    const h = highlightPath('b', [
      e('1', 'a', 'b'),
      e('2', 'b', 'c'),
      e('3', 'c', 'd'),
      e('4', 'x', 'y'),
    ]);
    expect([...h.before]).toEqual(['a']);
    expect([...h.after].sort()).toEqual(['c', 'd']);
    expect([...h.beforeEdges]).toEqual(['1']);
    expect([...h.afterEdges].sort()).toEqual(['2', '3']);
    expect(h.nodes.has('x')).toBe(false);
  });
});

describe('fitZoom', () => {
  it('большая схема уменьшается, малая не раздувается больше 1.3', () => {
    const big = { positions: {}, columns: [], width: 2000, height: 800 };
    expect(fitZoom(big, { width: 1000, height: 800 })).toBeLessThan(0.5);
    const small = { positions: {}, columns: [], width: 100, height: 100 };
    expect(fitZoom(small, { width: 1000, height: 800 })).toBe(1.3);
  });
  it('не меньше нижнего предела и не ломается на нулевом окне', () => {
    const huge = { positions: {}, columns: [], width: 20000, height: 20000 };
    expect(fitZoom(huge, { width: 300, height: 300 })).toBe(0.3);
    expect(fitZoom(huge, { width: 0, height: 0 })).toBe(1);
  });
});
