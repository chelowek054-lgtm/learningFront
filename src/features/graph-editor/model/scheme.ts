// Схема графа пути (T-0113…T-0117, R-0061): раскладка, состояния освоения, подписи, фильтры, подсветка пути.
// Чистая логика над данными графа и карты освоенности: без сети и без UI, поэтому покрыта тестами.
import type { GraphEdge, GraphNode, MasteryMap } from '@/shared/api';

export const NODE_W = 168;
export const NODE_H = 52;
export const COL_GAP = 72;
export const ROW_GAP = 14;
export const HEADER_H = 34;

const LEVEL_ORDER = { basic: 0, middle: 1, advanced: 2 } as const;
const LEVEL_TEXT = { basic: 'база', middle: 'средний', advanced: 'продвинутый' } as const;
const LOOSE_ORDER = 9999;

export interface Position {
  x: number;
  y: number;
}

export interface Column {
  key: string;
  title: string;
  x: number;
  count: number;
}

export interface SchemeLayout {
  positions: Record<string, Position>;
  columns: Column[];
  width: number;
  height: number;
}

/** Слева направо по этапам, внутри этапа сверху вниз по уровню, затем по названию; узлы без этапа — в конце. */
export function layoutScheme(
  nodes: GraphNode[],
  collapsed: ReadonlySet<string> = new Set(),
): SchemeLayout {
  const byStage = new Map<string, { order: number; title: string; items: GraphNode[] }>();
  for (const n of nodes) {
    const key = n.stage ?? '';
    const entry = byStage.get(key) ?? {
      order: n.stage ? (n.stageOrder ?? LOOSE_ORDER - 1) : LOOSE_ORDER,
      title: n.stage ?? 'Прочее',
      items: [],
    };
    entry.items.push(n);
    byStage.set(key, entry);
  }
  const stages = [...byStage.entries()].sort((a, b) => a[1].order - b[1].order);
  const positions: Record<string, Position> = {};
  const columns: Column[] = [];
  let x = 0;
  let height = HEADER_H;
  for (const [key, stage] of stages) {
    const hidden = collapsed.has(key);
    const items = [...stage.items].sort(
      (a, b) =>
        (a.level ? LEVEL_ORDER[a.level] : 1) - (b.level ? LEVEL_ORDER[b.level] : 1) ||
        a.title.localeCompare(b.title, 'ru'),
    );
    columns.push({ key, title: stage.title, x, count: items.length });
    if (!hidden) {
      items.forEach((n, i) => {
        positions[n.id] = { x, y: HEADER_H + i * (NODE_H + ROW_GAP) };
      });
      height = Math.max(height, HEADER_H + items.length * (NODE_H + ROW_GAP));
    }
    x += (hidden ? 56 : NODE_W) + COL_GAP;
  }
  return { positions, columns, width: Math.max(0, x - COL_GAP), height };
}

// ---- состояния освоения ----

export type MasteryState = 'locked' | 'frontier' | 'learning' | 'known';

/** conceptId → состояние; понятия без записи в карте освоенности состояния не имеют. */
export function masteryStates(
  map: MasteryMap | null,
  nodes: GraphNode[] = [],
): Record<string, MasteryState> {
  const out: Record<string, MasteryState> = {};
  // Без карты освоенности берём статус из самого узла: схема не теряет «освоено» и «изучаю».
  if (!map) {
    for (const n of nodes) {
      if (n.status === 'known' || n.status === 'learning') out[n.id] = n.status;
    }
    return out;
  }
  for (const n of map.nodes) out[n.conceptId] = n.status;
  return out;
}

/** conceptId → оценка освоенности 0..1: по ней рисуется отметка прогресса у изучаемых понятий. */
export function masteryEstimates(map: MasteryMap | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of map?.nodes ?? []) out[n.conceptId] = Math.max(0, Math.min(1, n.estimate ?? 0));
  return out;
}

export interface Look {
  /** Прозрачность узла: пройденное приглушено, но остаётся на месте. */
  opacity: number;
  /** Граница изучения подсвечена, закрытое выглядит закрытым. */
  emphasis: 'none' | 'frontier' | 'learning' | 'locked';
  dashed: boolean;
}

export function lookOf(node: GraphNode, state: MasteryState | undefined): Look {
  return {
    opacity: state === 'known' ? 0.42 : state === 'locked' ? 0.7 : 1,
    emphasis:
      state === 'frontier'
        ? 'frontier'
        : state === 'learning'
          ? 'learning'
          : state === 'locked'
            ? 'locked'
            : 'none',
    dashed: node.optional === true,
  };
}

/** Подписи узла без служебных слов: вместо «c0.149 · inherited» — понятные человеку метки. */
export function tagsOf(node: GraphNode): string[] {
  const tags: string[] = [];
  if (node.level && LEVEL_TEXT[node.level]) tags.push(LEVEL_TEXT[node.level]);
  if (node.optional) tags.push('необязательное');
  if (node.kind === 'personal') tags.push('своё');
  else if (node.reviewStatus === 'draft') tags.push('не проверено куратором');
  return tags;
}

/** Размер узла по центральности: чем больше связей опирается на понятие, тем оно крупнее (до +30%). */
export function scaleOf(node: GraphNode): number {
  return 1 + Math.min(Math.max(node.centrality ?? 0, 0), 1) * 0.3;
}

// ---- фильтры и поиск ----

export interface Filters {
  query: string;
  studyNow: boolean;
  hideKnown: boolean;
  optionalOnly: boolean;
  mineOnly: boolean;
}

export const NO_FILTERS: Filters = {
  query: '',
  studyNow: false,
  hideKnown: false,
  optionalOnly: false,
  mineOnly: false,
};

export function matches(
  node: GraphNode,
  filters: Filters,
  states: Record<string, MasteryState>,
): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !node.title.toLowerCase().includes(q)) return false;
  const state = states[node.id];
  if (filters.studyNow && state !== 'frontier' && state !== 'learning') return false;
  if (filters.hideKnown && state === 'known') return false;
  if (filters.optionalOnly && !node.optional) return false;
  if (filters.mineOnly && node.kind !== 'personal') return false;
  return true;
}

export const isFiltering = (f: Filters): boolean =>
  f.query.trim() !== '' || f.studyNow || f.hideKnown || f.optionalOnly || f.mineOnly;

// ---- подсветка пути ----

export interface Highlight {
  /** Предпосылки до корня и то, что понятие открывает, плюс оно само. */
  nodes: Set<string>;
  edges: Set<string>;
}

/** По нажатию: все предпосылки выбранного понятия до корня и всё, что оно открывает. Рёбра — по prereq. */
export function highlightPath(nodeId: string, edges: GraphEdge[]): Highlight {
  const prereq = edges.filter((e) => e.type === 'prereq');
  const nodes = new Set<string>([nodeId]);
  const marked = new Set<string>();
  const walk = (start: string, toward: 'from' | 'to') => {
    const queue = [start];
    while (queue.length) {
      const cur = queue.pop() as string;
      for (const e of prereq) {
        const here = toward === 'from' ? e.to : e.from;
        const next = toward === 'from' ? e.from : e.to;
        if (here === cur) {
          marked.add(e.id);
          if (!nodes.has(next)) {
            nodes.add(next);
            queue.push(next);
          }
        }
      }
    }
  };
  walk(nodeId, 'from'); // что нужно раньше
  walk(nodeId, 'to'); // что открывается после
  return { nodes, edges: marked };
}

// ---- рёбра на холсте ----

export interface Segment {
  left: number;
  top: number;
  length: number;
  angle: number;
}

/** Отрезок между серединами правой кромки одного узла и левой кромки другого: рисуется повёрнутым View. */
export function segmentBetween(a: Position, b: Position): Segment {
  // Узлы одного этапа стоят в одной колонке: связь идёт вертикально вдоль правой кромки, а не назад под узлами.
  if (a.x === b.x) {
    const x = a.x + NODE_W + 12;
    const y1 = a.y + NODE_H / 2;
    const y2 = b.y + NODE_H / 2;
    const length = Math.abs(y2 - y1);
    return { left: x - length / 2, top: (y1 + y2) / 2, length, angle: 90 };
  }
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  return {
    left: (x1 + x2) / 2 - length / 2,
    top: (y1 + y2) / 2,
    length,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

// ---- слой «шаги курса» (T-0123, R-0066) ----

import type { Course } from '@/shared/api';

/** Шаги курса как узлы схемы: те же холст и легенда; рёбра — порядок шагов внутри области. */
export function courseAsGraph(course: Course): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mastery: MasteryMap;
} {
  const areas = [...new Set(course.steps.map((s) => s.domain ?? ''))];
  const nodes = course.steps.map((s) => {
    const area = Math.max(0, areas.indexOf(s.domain ?? ''));
    // Этапы разных областей не склеиваются: у каждой области свой диапазон порядка и своя подпись.
    const stage = s.stage ? (areas.length > 1 ? `${s.domain}: ${s.stage}` : s.stage) : null;
    return {
      id: s.conceptId,
      kind: 'canonical',
      title: s.title,
      stage,
      stageOrder: s.stage ? area * 100 + (s.stageOrder ?? 50) : null,
      level: s.level ?? null,
      optional: s.optional === true,
      centrality: 0,
      reviewStatus: s.status === 'draft' ? 'draft' : 'approved',
      content: {},
    } as unknown as GraphNode;
  });
  const edges: GraphEdge[] = [];
  const lastByArea = new Map<string, string>();
  course.steps.forEach((s, i) => {
    const area = s.domain ?? '';
    const prev = lastByArea.get(area);
    if (prev)
      edges.push({ id: `c${i}`, from: prev, to: s.conceptId, type: 'prereq', kind: 'canonical' });
    lastByArea.set(area, s.conceptId);
  });
  const currentId = course.current?.conceptId;
  let seenCurrent = false;
  const states = course.steps.map((s) => {
    if (s.done) return { conceptId: s.conceptId, status: 'known' };
    if (s.conceptId === currentId) {
      seenCurrent = true;
      return { conceptId: s.conceptId, status: 'learning' };
    }
    return { conceptId: s.conceptId, status: seenCurrent ? 'locked' : 'frontier' };
  });
  return {
    nodes,
    edges,
    mastery: { domain: course.domain, nodes: states, summary: {} } as unknown as MasteryMap,
  };
}
