// Легенда схемы (R-0069, T-0135): строки собираются из того, что реально нарисовано, и показывают число.
// Один набор правил на встроенную схему, полноэкранный режим и «Дерево»; образцы рисует ui/scheme-legend.tsx.
import type { GraphEdge, GraphNode } from '@/shared/api';
import { scaleOf, type MasteryState } from './scheme';
import { translate } from '../../../shared/i18n-core';

/** Что рисует образец: тот же вид, что у узла или линии на холсте. */
export type LegendSample =
  | {
      kind: 'node';
      look: 'known' | 'frontier' | 'learning' | 'locked' | 'optional' | 'own' | 'base';
    }
  | { kind: 'edge'; tone: 'prereq' | 'own' | 'before' | 'after'; dashed: boolean }
  | { kind: 'size' }
  | { kind: 'label' }
  | { kind: 'stage' }
  | { kind: 'count' }
  | { kind: 'ghost' };

export interface LegendItem {
  id: string;
  sample: LegendSample;
  text: string;
  /** Сколько таких знаков на схеме; у пояснений без счёта его нет. */
  count?: number;
}

export type LegendMode = 'map' | 'tree';

export interface LegendInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  states: Record<string, MasteryState>;
  mode: LegendMode;
  /** Выбрано понятие: в легенде появляются синие и зелёные связи. */
  selected: boolean;
  /** Схема показана обзором по этапам (T-0142): добавляются знаки блока, стрелки-счётчика, порта, призрака. */
  grouped?: boolean;
}

const TEXT: Record<
  LegendMode,
  Record<'known' | 'frontier' | 'learning' | 'locked' | 'optional' | 'edge', string>
> = {
  map: {
    get known() {
      return translate('graphEditorLegend.1');
    },
    get frontier() {
      return translate('graphEditorLegend.2');
    },
    get learning() {
      return translate('graphEditorLegend.3');
    },
    get locked() {
      return translate('graphEditorLegend.4');
    },
    get optional() {
      return translate('graphEditorLegend.5');
    },
    get edge() {
      return translate('graphEditorLegend.6');
    },
  },
  tree: {
    get known() {
      return translate('graphEditorLegend.7');
    },
    get frontier() {
      return translate('graphEditorLegend.8');
    },
    get learning() {
      return translate('graphEditorLegend.9');
    },
    get locked() {
      return translate('graphEditorLegend.10');
    },
    get optional() {
      return translate('graphEditorLegend.11');
    },
    get edge() {
      return translate('graphEditorLegend.12');
    },
  },
};

/** Строки легенды для того, что сейчас на схеме: знак, которого нет, не показывается. */
export function legendFor(input: LegendInput): LegendItem[] {
  const { nodes, edges, states, mode } = input;
  const t = TEXT[mode];
  const count = (state: MasteryState) => nodes.filter((n) => states[n.id] === state).length;
  const items: LegendItem[] = [];
  const add = (item: LegendItem) => {
    if (item.count === undefined || item.count > 0) items.push(item);
  };

  add({
    id: 'known',
    sample: { kind: 'node', look: 'known' },
    text: t.known,
    count: count('known'),
  });
  add({
    id: 'frontier',
    sample: { kind: 'node', look: 'frontier' },
    text: t.frontier,
    count: count('frontier'),
  });
  add({
    id: 'learning',
    sample: { kind: 'node', look: 'learning' },
    text: t.learning,
    count: count('learning'),
  });
  add({
    id: 'locked',
    sample: { kind: 'node', look: 'locked' },
    text: t.locked,
    count: count('locked'),
  });
  add({
    id: 'optional',
    sample: { kind: 'node', look: 'optional' },
    text: t.optional,
    count: nodes.filter((n) => n.optional === true).length,
  });
  // Своё и общая основа различаются только в «Карте»: у шагов курса личного слоя нет.
  if (mode === 'map') {
    add({
      id: 'own',
      sample: { kind: 'node', look: 'own' },
      text: translate('graphEditorLegend.13'),
      count: nodes.filter((n) => n.kind === 'personal').length,
    });
    add({
      id: 'size',
      sample: { kind: 'size' },
      text: translate('graphEditorLegend.14'),
      count: nodes.filter((n) => scaleOf(n) > 1).length,
    });
  }
  const own = edges.filter((e) => e.kind === 'personal').length;
  add({
    id: 'edge',
    sample: { kind: 'edge', tone: 'prereq', dashed: false },
    text: t.edge,
    count: edges.length - own,
  });
  add({
    id: 'own-edge',
    sample: { kind: 'edge', tone: 'own', dashed: true },
    text: translate('graphEditorLegend.15'),
    count: own,
  });
  if (input.selected) {
    items.push(
      {
        id: 'before',
        sample: { kind: 'edge', tone: 'before', dashed: false },
        text: translate('graphEditorLegend.16'),
      },
      {
        id: 'after',
        sample: { kind: 'edge', tone: 'after', dashed: false },
        text: translate('graphEditorLegend.17'),
      },
    );
  }
  if (nodes.some((n) => n.optional === true || n.level || n.reviewStatus === 'draft')) {
    items.push({
      id: 'label',
      sample: { kind: 'label' },
      text: translate('graphEditorLegend.18'),
    });
  }
  if (input.grouped) {
    items.push({
      id: 'stage',
      sample: { kind: 'stage' },
      text: translate('graphEditorLegend.19'),
    });
    // Стрелки-счётчики рисуются без выбора, призраки — только вместе с выбранным понятием.
    if (!input.selected) {
      items.push({
        id: 'count',
        sample: { kind: 'count' },
        text: translate('graphEditorLegend.20'),
      });
    } else {
      items.push({
        id: 'ghost',
        sample: { kind: 'ghost' },
        text: translate('graphEditorLegend.21'),
      });
    }
  }
  return items;
}
