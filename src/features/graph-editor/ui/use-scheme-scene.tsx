// Что рисуется на холсте схемы: обычная раскладка по этапам или обзор по этапам (R-0070, T-0142…T-0143).
// Один хук на встроенную схему и на полноэкранный режим: выбор вида, раскрытые этапы, «Вся цепочка» и список
// связей живут здесь, поэтому оба холста показывают одно и то же.
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Graph, GraphNode } from '@/shared/api';
import {
  buildOverview,
  isGhost,
  realId,
  shouldGroup,
  type Overview,
  type StageLink,
} from '../model/overview';
import { legendFor, type LegendItem, type LegendMode } from '../model/legend';
import { rememberFlag, remembered } from '../model/remember';
import { stageKeyOf, type Highlight, type MasteryState, type SchemeLayout } from '../model/scheme';
import { StageLayer } from './stage-layer';

/** `auto` — по порогу (25 понятий или 40 связей), `stages` и `all` — выбор человека; он запоминается. */
export type SchemeViewMode = 'auto' | 'stages' | 'all';

const KEY = 'graph-view-stages';

function rememberedView(): SchemeViewMode {
  // Флаг хранит только явный выбор: «Этапы» — true, «Всё» — false; пока выбора не было, решает порог.
  const stages = remembered('graph-view-stages', true);
  const set = remembered('graph-view-set', false);
  return set ? (stages ? 'stages' : 'all') : 'auto';
}

export interface SchemeScene {
  grouped: boolean;
  /** Есть смысл переключать вид: этапов хотя бы два. */
  switchable: boolean;
  view: SchemeViewMode;
  setView: (view: SchemeViewMode) => void;
  overview: Overview | null;
  fullChain: boolean;
  setFullChain: (on: boolean) => void;
  /** Что холст рисует вместо исходного графа. */
  graph: Graph;
  layout: SchemeLayout;
  highlight: Highlight | null;
  states: Record<string, MasteryState>;
  ports: Record<string, string> | undefined;
  /** Слой блоков и стрелок поверх холста; в обычном виде его нет. */
  layer: (zoom: number) => ReactNode;
  legend: LegendItem[];
  /** Нажатие на узел: призрак переносит выбор на настоящее понятие и раскрывает его этап. */
  select: (id: string | null) => void;
  toggleStage: (key: string) => void;
  collapseAll: () => void;
  link: StageLink | null;
  closeLink: () => void;
  /** Раскрытые этапы в порядке раскрытия: для пути «Все этапы › …». */
  expandedKeys: string[];
}

export function useSchemeScene({
  graph,
  states,
  layout,
  highlight,
  selected,
  setSelected,
  mode,
  plainToggleStage,
}: {
  graph: Graph;
  states: Record<string, MasteryState>;
  /** Обычная раскладка (с учётом свёрнутых колонок) и подсветка по всей цепочке. */
  layout: SchemeLayout;
  highlight: Highlight | null;
  selected: string | null;
  setSelected: (id: string | null) => void;
  mode: LegendMode;
  /** Свёртка колонки в обычном виде. */
  plainToggleStage: (key: string) => void;
}): SchemeScene {
  const [view, setViewState] = useState<SchemeViewMode>(rememberedView);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [fullChain, setFullChain] = useState(false);
  const [link, setLink] = useState<StageLink | null>(null);

  const auto = useMemo(() => shouldGroup(graph.nodes, graph.edges), [graph.nodes, graph.edges]);
  const stagesCount = useMemo(() => new Set(graph.nodes.map(stageKeyOf)).size, [graph.nodes]);
  const grouped = stagesCount >= 2 && (view === 'stages' || (view === 'auto' && auto));
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);

  const overview = useMemo(
    () =>
      grouped
        ? buildOverview({
            nodes: graph.nodes,
            edges: graph.edges,
            states,
            expanded: new Set(expanded),
            selected,
            fullChain,
          })
        : null,
    [grouped, graph.nodes, graph.edges, states, expanded, selected, fullChain],
  );

  const setView = useCallback((next: SchemeViewMode) => {
    setViewState(next);
    // Явный выбор запоминается на устройстве; «авто» значит «выбора не было».
    if (next === 'auto') {
      rememberFlag('graph-view-set', false);
    } else {
      rememberFlag('graph-view-set', true);
      rememberFlag(KEY, next === 'stages');
    }
    setLink(null);
  }, []);

  const select = useCallback(
    (id: string | null) => {
      if (id === null) {
        setSelected(null);
        return;
      }
      const real = realId(id);
      setSelected(real);
      const node = byId.get(real);
      if (grouped && node) {
        const key = stageKeyOf(node);
        setExpanded((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }
    },
    [byId, grouped, setSelected],
  );

  const toggleStage = useCallback(
    (key: string) => {
      if (!grouped) {
        plainToggleStage(key);
        return;
      }
      setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
      // Сворачиваем этап с выбранным понятием — выбор снимается, иначе этап раскрылся бы обратно.
      const node = selected ? byId.get(selected) : undefined;
      if (node && stageKeyOf(node) === key) setSelected(null);
      setLink(null);
    },
    [grouped, plainToggleStage, selected, byId, setSelected],
  );

  const expandStage = useCallback((key: string) => {
    setExpanded((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded([]);
    setSelected(null);
    setLink(null);
  }, [setSelected]);

  const canvasGraph = useMemo<Graph>(
    () =>
      overview ? ({ ...graph, nodes: overview.nodes, edges: overview.edges } as Graph) : graph,
    [graph, overview],
  );
  const canvasStates = useMemo(() => {
    if (!overview) return states;
    const out = { ...states };
    for (const n of overview.nodes) {
      if (isGhost(n.id)) {
        const s = states[realId(n.id)];
        if (s) out[n.id] = s;
      }
    }
    return out;
  }, [overview, states]);

  const legendNodes: GraphNode[] = overview
    ? overview.nodes.filter((n) => !isGhost(n.id))
    : graph.nodes;
  const legend = useMemo(
    () =>
      legendFor({
        nodes: legendNodes,
        edges: overview ? overview.edges : graph.edges,
        states,
        mode,
        selected: selected !== null,
        grouped,
      }),
    // legendNodes выводится из overview и graph — зависимостей ниже достаточно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overview, graph.nodes, graph.edges, states, mode, selected, grouped],
  );

  const layer = useCallback(
    (zoom: number): ReactNode =>
      overview ? (
        <StageLayer
          overview={overview}
          zoom={zoom}
          onToggleStage={toggleStage}
          onOpenLink={setLink}
          onExpandStage={expandStage}
        />
      ) : null,
    [overview, toggleStage, expandStage],
  );

  return {
    grouped,
    switchable: stagesCount >= 2,
    view,
    setView,
    overview,
    fullChain,
    setFullChain,
    graph: canvasGraph,
    layout: overview ? overview.layout : layout,
    highlight: overview ? overview.highlight : highlight,
    states: canvasStates,
    ports: overview?.ports,
    layer,
    legend,
    select,
    toggleStage,
    collapseAll,
    link,
    closeLink: () => setLink(null),
    expandedKeys: overview ? expanded.filter((k) => overview.boxes.some((b) => b.key === k)) : [],
  };
}
