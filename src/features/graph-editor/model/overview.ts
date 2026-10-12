// Обзор схемы по этапам (R-0070, T-0142, T-0143): на крупном графе этапы — блоки, связи между ними — одна стрелка
// со счётчиком, этап раскрывается на месте, у выбранного понятия рисуются только его связи, а соседи из свёрнутых
// этапов показаны «призраками». Чистые функции над узлами и рёбрами; рисует их ui/stage-overview.tsx.
import type { GraphEdge, GraphNode } from '@/shared/api';
import {
  barsOf,
  COL_GAP,
  HEADER_H,
  highlightPath,
  NODE_H,
  NODE_W,
  ROW_GAP,
  stageKeyOf,
  stagesOf,
  type Bar,
  type Highlight,
  type MasteryState,
  type Position,
  type SchemeLayout,
} from './scheme';

/** Порог автоматического обзора: больше понятий или связей (и хотя бы два этапа). */
export const OVERVIEW_NODES = 25;
export const OVERVIEW_EDGES = 40;
/** Сколько призраков одного этапа показывать; остальные сворачиваются в «ещё N». */
export const GHOST_MAX = 8;
/** Свёрнутый блок занимает столько рядов узлов: заголовок, счёт освоения и полоса. */
const BLOCK_ROWS = 2;
const ROW = NODE_H + ROW_GAP;
export const BLOCK_H = HEADER_H + BLOCK_ROWS * NODE_H + (BLOCK_ROWS - 1) * ROW_GAP;
const CHANNEL = 14;
const LANE_STEP = 8;
const LANE_CAP = 6;

export const GHOST_PREFIX = 'ghost:';
export const isGhost = (id: string): boolean => id.startsWith(GHOST_PREFIX);
export const realId = (id: string): string => (isGhost(id) ? id.slice(GHOST_PREFIX.length) : id);

/** Обзор включается сам на крупном графе: больше 25 понятий или 40 связей и хотя бы два этапа. */
export function shouldGroup(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const stages = new Set(nodes.map(stageKeyOf)).size;
  const prereq = edges.filter((e) => e.type === 'prereq').length;
  return stages >= 2 && (nodes.length > OVERVIEW_NODES || prereq > OVERVIEW_EDGES);
}

export interface StageBox {
  key: string;
  title: string;
  area: string | null;
  /** Сколько понятий в этапе и сколько из них освоено. */
  count: number;
  known: number;
  expanded: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Все связи между двумя этапами, свёрнутые в одну. */
export interface StageLink {
  id: string;
  from: string;
  to: string;
  edges: { id: string; from: string; to: string }[];
}

export interface StageArrow {
  link: StageLink;
  bars: Bar[];
  arrow: { x: number; y: number; dir: 'right' | 'left' };
  /** Где стоит счётчик: по нажатию открывается список связей. */
  pill: Position;
  thickness: number;
}

export interface MoreChip {
  key: string;
  count: number;
  x: number;
  y: number;
}

export interface Overview {
  /** Положения видимых понятий и призраков; заголовков колонок нет — вместо них блоки. */
  layout: SchemeLayout;
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlight: Highlight | null;
  boxes: StageBox[];
  arrows: StageArrow[];
  more: MoreChip[];
  /** Метка «← 2 · 3 →» у понятий раскрытого этапа: сколько связей уходит в другие этапы. */
  ports: Record<string, string>;
  /** Какие этапы раскрыты на самом деле: выбранное понятие раскрывает свой этап. */
  expanded: Set<string>;
  links: StageLink[];
}

export interface OverviewInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  states: Record<string, MasteryState>;
  expanded: ReadonlySet<string>;
  selected: string | null;
  /** «Вся цепочка»: у выбранного — все предпосылки и всё, что оно открывает, а не только прямые связи. */
  fullChain: boolean;
}

/** Связи между этапами: по одной на упорядоченную пару этапов; связи внутри этапа сюда не попадают. */
export function stageLinks(nodes: GraphNode[], edges: GraphEdge[]): StageLink[] {
  const stageOf = new Map(nodes.map((n) => [n.id, stageKeyOf(n)]));
  const links = new Map<string, StageLink>();
  for (const e of edges) {
    if (e.type !== 'prereq') continue;
    const a = stageOf.get(e.from);
    const b = stageOf.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    const id = `${a}\u0001${b}`;
    const link = links.get(id) ?? { id, from: a, to: b, edges: [] };
    link.edges.push({ id: e.id, from: e.from, to: e.to });
    links.set(id, link);
  }
  return [...links.values()];
}

/** Метка порта «← 2 · 3 →»: сколько связей приходит из других этапов и сколько уходит в другие этапы. */
function portLabel(before: number, after: number): string {
  const parts: string[] = [];
  if (before > 0) parts.push(`← ${before}`);
  if (after > 0) parts.push(`${after} →`);
  return parts.join(' · ');
}

export function buildOverview(input: OverviewInput): Overview {
  const { nodes, edges, states, selected, fullChain } = input;
  const stages = stagesOf(nodes);
  const index = new Map(stages.map((s, i) => [s.key, i]));
  const stageOf = new Map(nodes.map((n) => [n.id, stageKeyOf(n)]));
  const prereq = edges.filter((e) => e.type === 'prereq');

  // Выбранное понятие раскрывает свой этап: иначе его не было бы на схеме.
  const expanded = new Set(input.expanded);
  const selectedStage = selected ? stageOf.get(selected) : undefined;
  if (selectedStage !== undefined) expanded.add(selectedStage);

  const links = stageLinks(nodes, prereq);
  const forwardLong = links.filter((l) => (index.get(l.to) ?? 0) - (index.get(l.from) ?? 0) > 1);
  const backward = links.filter((l) => (index.get(l.to) ?? 0) < (index.get(l.from) ?? 0));
  const top = 16 + LANE_STEP * Math.min(forwardLong.length, LANE_CAP);

  // Блоки и раскрытые этапы.
  const boxes: StageBox[] = stages.map((stage, i) => {
    const open = expanded.has(stage.key);
    return {
      key: stage.key,
      title: stage.title,
      area: stage.area,
      count: stage.items.length,
      known: stage.items.filter((n) => states[n.id] === 'known').length,
      expanded: open,
      x: i * (NODE_W + COL_GAP),
      y: top,
      w: NODE_W,
      h: open ? HEADER_H + stage.items.length * ROW - ROW_GAP : BLOCK_H,
    };
  });
  const boxByKey = new Map(boxes.map((b) => [b.key, b]));

  const positions: Record<string, Position> = {};
  const visible: GraphNode[] = [];
  for (const stage of stages) {
    if (!expanded.has(stage.key)) continue;
    const box = boxByKey.get(stage.key)!;
    stage.items.forEach((n, i) => {
      positions[n.id] = { x: box.x, y: top + HEADER_H + i * ROW };
      visible.push(n);
    });
  }

  // Порты: у понятий раскрытого этапа — сколько связей приходит из других этапов и уходит в них.
  const ports: Record<string, string> = {};
  for (const stage of stages) {
    if (!expanded.has(stage.key)) continue;
    for (const n of stage.items) {
      const before = prereq.filter(
        (e) => e.to === n.id && stageOf.get(e.from) !== stage.key,
      ).length;
      const after = prereq.filter((e) => e.from === n.id && stageOf.get(e.to) !== stage.key).length;
      if (before + after > 0) ports[n.id] = portLabel(before, after);
    }
  }

  let drawn: GraphEdge[];
  let highlight: Highlight | null = null;
  const ghosts: GraphNode[] = [];
  const more: MoreChip[] = [];
  const mapId = (id: string) => (positions[id] ? id : `${GHOST_PREFIX}${id}`);
  let arrows: StageArrow[] = [];

  if (selected && stageOf.has(selected)) {
    const full = highlightPath(selected, edges);
    const direct = prereq.filter((e) => e.from === selected || e.to === selected);
    const relEdges = fullChain ? prereq.filter((e) => full.edges.has(e.id)) : direct;
    const relNodes = new Set<string>([selected]);
    for (const e of relEdges) {
      relNodes.add(e.from);
      relNodes.add(e.to);
    }
    // Призраки: понятия связей выбранного, чей этап свёрнут; по этапам, не больше GHOST_MAX на этап.
    const ghostTop = top + HEADER_H + BLOCK_ROWS * ROW;
    for (const stage of stages) {
      if (expanded.has(stage.key)) continue;
      const items = stage.items.filter((n) => relNodes.has(n.id));
      if (!items.length) continue;
      const box = boxByKey.get(stage.key)!;
      const shown = items.length > GHOST_MAX ? items.slice(0, GHOST_MAX - 1) : items;
      shown.forEach((n, i) => {
        const id = `${GHOST_PREFIX}${n.id}`;
        positions[id] = { x: box.x, y: ghostTop + i * ROW };
        ghosts.push({ ...n, id, optional: true });
      });
      if (items.length > shown.length) {
        more.push({
          key: stage.key,
          count: items.length - shown.length,
          x: box.x,
          y: ghostTop + shown.length * ROW,
        });
      }
    }
    drawn = relEdges
      .map((e) => ({ ...e, from: mapId(e.from), to: mapId(e.to) }))
      .filter((e) => positions[e.from] && positions[e.to]);
    const placed = (ids: Iterable<string>) =>
      new Set([...ids].map(mapId).filter((id) => positions[id] !== undefined));
    const beforeIds = fullChain
      ? full.before
      : direct.filter((e) => e.to === selected).map((e) => e.from);
    const afterIds = fullChain
      ? full.after
      : direct.filter((e) => e.from === selected).map((e) => e.to);
    const edgeIds = new Set(drawn.map((e) => e.id));
    const directBefore = new Set(direct.filter((e) => e.to === selected).map((e) => e.id));
    const directAfter = new Set(direct.filter((e) => e.from === selected).map((e) => e.id));
    highlight = {
      nodes: placed(relNodes),
      edges: edgeIds,
      before: placed(beforeIds),
      beforeEdges: new Set(
        [...(fullChain ? full.beforeEdges : directBefore)].filter((id) => edgeIds.has(id)),
      ),
      after: placed(afterIds),
      afterEdges: new Set(
        [...(fullChain ? full.afterEdges : directAfter)].filter((id) => edgeIds.has(id)),
      ),
    };
  } else {
    // Без выбора: связи внутри раскрытых этапов и стрелки-счётчики между этапами.
    drawn = prereq.filter((e) => {
      const a = stageOf.get(e.from);
      return a !== undefined && a === stageOf.get(e.to) && expanded.has(a);
    });
    arrows = routeStageLinks(links, boxes, index, forwardLong, backward);
  }

  const bottomBars = backward.length ? 12 + LANE_STEP * Math.min(backward.length, LANE_CAP) : 0;
  const lowest = Math.max(
    ...boxes.map((b) => b.y + b.h),
    ...Object.values(positions).map((p) => p.y + NODE_H),
    ...more.map((m) => m.y + NODE_H),
    top + BLOCK_H,
  );
  const layout: SchemeLayout = {
    top,
    positions,
    columns: [],
    width: Math.max(0, stages.length * (NODE_W + COL_GAP) - COL_GAP),
    height: lowest + (selected ? 0 : bottomBars),
  };
  return {
    layout,
    nodes: [...visible, ...ghosts],
    edges: drawn,
    highlight,
    boxes,
    arrows,
    more,
    ports,
    expanded,
    links,
  };
}

/** Стрелки между блоками: соседние этапы — через промежуток, дальние — по дорожке над схемой, обратные — под ней. */
function routeStageLinks(
  links: StageLink[],
  boxes: StageBox[],
  index: Map<string, number>,
  forwardLong: StageLink[],
  backward: StageLink[],
): StageArrow[] {
  const byKey = new Map(boxes.map((b) => [b.key, b]));
  const outCount = new Map<string, number>();
  const inCount = new Map<string, number>();
  for (const l of links) {
    outCount.set(l.from, (outCount.get(l.from) ?? 0) + 1);
    inCount.set(l.to, (inCount.get(l.to) ?? 0) + 1);
  }
  const outSeen = new Map<string, number>();
  const inSeen = new Map<string, number>();
  const spread = (box: StageBox, seen: Map<string, number>, total: Map<string, number>) => {
    const i = seen.get(box.key) ?? 0;
    seen.set(box.key, i + 1);
    const n = total.get(box.key) ?? 1;
    const raw = box.y + box.h / 2 + (i - (n - 1) / 2) * 8;
    return Math.min(box.y + box.h - 12, Math.max(box.y + 12, raw));
  };
  const lowest = Math.max(...boxes.map((b) => b.y + b.h));
  const top = Math.min(...boxes.map((b) => b.y));

  return links.map((link) => {
    const a = byKey.get(link.from)!;
    const b = byKey.get(link.to)!;
    const i = index.get(link.from) ?? 0;
    const j = index.get(link.to) ?? 0;
    const y1 = spread(a, outSeen, outCount);
    const y2 = spread(b, inSeen, inCount);
    const thickness = 1.5 + Math.min(link.edges.length, 8) * 0.4;
    let pts: [number, number][];
    let dir: 'right' | 'left' = 'right';
    let pill: Position;
    if (j - i === 1) {
      const x1 = a.x + a.w;
      const cx = (x1 + b.x) / 2;
      pts = [
        [x1, y1],
        [cx, y1],
        [cx, y2],
        [b.x, y2],
      ];
      pill = { x: cx, y: (y1 + y2) / 2 };
    } else if (j > i) {
      const lane = top - 10 - LANE_STEP * Math.min(forwardLong.indexOf(link), LANE_CAP - 1);
      const c1 = a.x + a.w + CHANNEL;
      const c2 = b.x - CHANNEL;
      pts = [
        [a.x + a.w, y1],
        [c1, y1],
        [c1, lane],
        [c2, lane],
        [c2, y2],
        [b.x, y2],
      ];
      pill = { x: (c1 + c2) / 2, y: lane };
    } else {
      const lane = lowest + 12 + LANE_STEP * Math.min(backward.indexOf(link), LANE_CAP - 1);
      const c1 = a.x - CHANNEL;
      const c2 = b.x + b.w + CHANNEL;
      pts = [
        [a.x, y1],
        [c1, y1],
        [c1, lane],
        [c2, lane],
        [c2, y2],
        [b.x + b.w, y2],
      ];
      dir = 'left';
      pill = { x: (c1 + c2) / 2, y: lane };
    }
    const last = pts[pts.length - 1]!;
    return {
      link,
      bars: barsOf(pts, thickness),
      arrow: { x: last[0], y: last[1], dir },
      pill,
      thickness,
    };
  });
}

/** Связи этапа с остальными: «опирается на N этапов · открывает M» для сводки над раскрытым этапом. */
export function stageSummary(links: StageLink[], key: string): { before: number; after: number } {
  return {
    before: new Set(links.filter((l) => l.to === key).map((l) => l.from)).size,
    after: new Set(links.filter((l) => l.from === key).map((l) => l.to)).size,
  };
}

/** Название этапа по ключу; у этапов разных областей оно может совпадать, поэтому область — в скобках. */
export function stageTitleOf(nodes: GraphNode[], key: string): string {
  const n = nodes.find((x) => stageKeyOf(x) === key);
  if (!n) return key;
  return `${n.stage ?? 'Прочее'}${n.area ? ` (${n.area})` : ''}`;
}
