// Схема графа пути (T-0113…T-0117, R-0061): раскладка, состояния освоения, подписи, фильтры, подсветка пути.
// Чистая логика над данными графа и карты освоенности: без сети и без UI, поэтому покрыта тестами.
import type { Course, GraphEdge, GraphNode, MasteryMap } from '@/shared/api';

export const NODE_W = 168;
export const NODE_H = 52;
export const COL_GAP = 72;
export const ROW_GAP = 20;
/** Заголовок колонки: название этапа и область отдельной строкой. */
export const HEADER_H = 54;

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
  /** Область этапа: подпись под названием; у схемы одной области её нет. */
  area: string | null;
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
  const byStage = new Map<
    string,
    { order: number; title: string; area: string | null; items: GraphNode[] }
  >();
  for (const n of nodes) {
    // Этапы разных областей не склеиваются, даже если называются одинаково.
    const key = n.area ? `${n.area}\u0000${n.stage ?? ''}` : (n.stage ?? '');
    const entry = byStage.get(key) ?? {
      order: n.stage ? (n.stageOrder ?? LOOSE_ORDER - 1) : LOOSE_ORDER,
      title: n.stage ?? 'Прочее',
      area: n.area ?? null,
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
    columns.push({ key, title: stage.title, area: stage.area, x, count: items.length });
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
  /** Только предпосылки (без самого понятия) и рёбра к ним: «нужно раньше». */
  before: Set<string>;
  beforeEdges: Set<string>;
  /** Только то, что открывается после, и рёбра к нему: «открывает». */
  after: Set<string>;
  afterEdges: Set<string>;
}

/** По нажатию: все предпосылки выбранного понятия до корня и всё, что оно открывает. Рёбра — по prereq. */
export function highlightPath(nodeId: string, edges: GraphEdge[]): Highlight {
  const prereq = edges.filter((e) => e.type === 'prereq');
  const walk = (toward: 'from' | 'to') => {
    const found = new Set<string>();
    const marked = new Set<string>();
    const queue = [nodeId];
    while (queue.length) {
      const cur = queue.pop() as string;
      for (const e of prereq) {
        const here = toward === 'from' ? e.to : e.from;
        const next = toward === 'from' ? e.from : e.to;
        if (here === cur) {
          marked.add(e.id);
          if (next !== nodeId && !found.has(next)) {
            found.add(next);
            queue.push(next);
          }
        }
      }
    }
    return { found, marked };
  };
  const before = walk('from'); // что нужно раньше
  const after = walk('to'); // что открывается после
  return {
    nodes: new Set([nodeId, ...before.found, ...after.found]),
    edges: new Set([...before.marked, ...after.marked]),
    before: before.found,
    beforeEdges: before.marked,
    after: after.found,
    afterEdges: after.marked,
  };
}

// ---- рёбра на холсте ----

/** Прямоугольник отрезка ребра в координатах холста. */
export interface Bar {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface EdgeRoute {
  bars: Bar[];
  /** Остриё стрелки у входа в целевой узел и в какую сторону оно смотрит. */
  arrow: { x: number; y: number; dir: 'right' | 'left' };
}

/** Отступ от кромки узла до канала, в котором ребро поворачивает. */
const CHANNEL = 14;

/** Y-координаты «дорожек» между рядами узлов: по ним рёбра проходят через колонки, не задевая узлы. */
export function laneYs(layout: SchemeLayout): number[] {
  const rows = Math.max(1, Math.round((layout.height - HEADER_H) / (NODE_H + ROW_GAP)));
  return Array.from(
    { length: rows + 1 },
    (_, k) => HEADER_H + k * (NODE_H + ROW_GAP) - ROW_GAP / 2,
  );
}

/** Небольшой сдвиг канала по номеру ребра: параллельные рёбра не сливаются в одну линию. */
export function jitterOf(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 5) - 2) * 4;
}

/**
 * Ломаная между узлами: из правой кромки источника, поворот в канале между колонками, при пропуске колонок —
 * по дорожке между рядами, вход слева в целевой узел. Узлы не пересекает: каналы и дорожки свободны.
 */
export function routeEdge(
  a: Position,
  b: Position,
  lanes: number[],
  jitter = 0,
  thickness = 2,
): EdgeRoute {
  const y1 = a.y + NODE_H / 2;
  const y2 = b.y + NODE_H / 2;
  const nearestLane = (target: number) =>
    lanes.reduce(
      (best, y) => (Math.abs(y - target) < Math.abs(best - target) ? y : best),
      lanes[0] ?? y1,
    );
  let pts: [number, number][];
  let dir: 'right' | 'left' = 'right';
  if (a.x === b.x) {
    // Одна колонка: связь идёт вдоль правой кромки и возвращается в узел справа.
    const xr = a.x + NODE_W + CHANNEL + Math.abs(jitter);
    pts = [
      [a.x + NODE_W, y1],
      [xr, y1],
      [xr, y2],
      [b.x + NODE_W, y2],
    ];
    dir = 'left';
  } else if (b.x > a.x) {
    const x1 = a.x + NODE_W;
    const x2 = b.x;
    const gap = x2 - x1;
    if (gap <= COL_GAP + 1) {
      const cx = x1 + gap / 2 + jitter;
      pts = [
        [x1, y1],
        [cx, y1],
        [cx, y2],
        [x2, y2],
      ];
    } else {
      // Пропущены колонки: уходим по дорожке между рядами.
      const lane = nearestLane(y1 === y2 ? y1 - (NODE_H + ROW_GAP) / 2 : (y1 + y2) / 2);
      const c1 = x1 + CHANNEL + jitter;
      const c2 = x2 - CHANNEL - jitter;
      pts = [
        [x1, y1],
        [c1, y1],
        [c1, lane],
        [c2, lane],
        [c2, y2],
        [x2, y2],
      ];
    }
  } else {
    // Ребро назад: огибаем по дорожке, входим справа.
    const lane = nearestLane((y1 + y2) / 2);
    const c1 = a.x - CHANNEL - jitter;
    const c2 = b.x + NODE_W + CHANNEL + jitter;
    pts = [
      [a.x, y1],
      [c1, y1],
      [c1, lane],
      [c2, lane],
      [c2, y2],
      [b.x + NODE_W, y2],
    ];
    dir = 'left';
  }
  const bars: Bar[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x3, y3] = pts[i]!;
    if (x0 === x3 && y0 === y3) continue;
    bars.push(
      y0 === y3
        ? {
            left: Math.min(x0, x3),
            top: y0 - thickness / 2,
            width: Math.abs(x3 - x0),
            height: thickness,
          }
        : {
            left: x0 - thickness / 2,
            top: Math.min(y0, y3),
            width: thickness,
            height: Math.abs(y3 - y0),
          },
    );
  }
  const last = pts[pts.length - 1]!;
  return { bars, arrow: { x: last[0], y: last[1], dir } };
}

// ---- слой «шаги курса» (T-0123, R-0066) ----

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
    const stage = s.stage ?? null;
    return {
      id: s.conceptId,
      kind: 'canonical',
      title: s.title,
      area: areas.length > 1 ? (s.domain ?? null) : null,
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

// ---- масштаб ----

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 1.6;
/** Поля холста вокруг схемы (как space.lg), px до масштабирования. */
const CANVAS_PAD = 16;

/** Масштаб, при котором вся схема помещается в окно; не крупнее 1.3, чтобы малый граф не раздувался. */
export function fitZoom(layout: SchemeLayout, viewport: { width: number; height: number }): number {
  const w = layout.width + CANVAS_PAD * 2;
  const h = layout.height + CANVAS_PAD * 2;
  if (w <= 0 || h <= 0 || viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.min(1.3, Math.max(ZOOM_MIN, Math.min(viewport.width / w, viewport.height / h)));
}
