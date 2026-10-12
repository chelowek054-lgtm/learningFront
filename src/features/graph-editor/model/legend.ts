// Легенда схемы (R-0069, T-0135): строки собираются из того, что реально нарисовано, и показывают число.
// Один набор правил на встроенную схему, полноэкранный режим и «Дерево»; образцы рисует ui/scheme-legend.tsx.
import type { GraphEdge, GraphNode } from '@/shared/api';
import { scaleOf, type MasteryState } from './scheme';

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
    known: 'освоено: остаётся на месте, но приглушено',
    frontier: 'можно изучать сейчас',
    learning: 'изучаю: чем длиннее полоса внизу, тем лучше освоено',
    locked: 'закрыто: сначала нужны предпосылки',
    optional: 'необязательное понятие',
    edge: 'нужно раньше',
  },
  tree: {
    known: 'пройдено',
    frontier: 'следующий шаг',
    learning: 'текущий шаг',
    locked: 'закрыто: сначала предыдущие шаги',
    optional: 'необязательный шаг',
    edge: 'порядок шагов',
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
      text: 'своё понятие (овал); прямоугольник — общая основа',
      count: nodes.filter((n) => n.kind === 'personal').length,
    });
    add({
      id: 'size',
      sample: { kind: 'size' },
      text: 'размер точки: чем больше понятий на нём стоит, тем крупнее',
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
    text: 'ваша личная связь (пунктир)',
    count: own,
  });
  if (input.selected) {
    items.push(
      {
        id: 'before',
        sample: { kind: 'edge', tone: 'before', dashed: false },
        text: 'у выбранного: нужно раньше',
      },
      {
        id: 'after',
        sample: { kind: 'edge', tone: 'after', dashed: false },
        text: 'у выбранного: открывает',
      },
    );
  }
  if (nodes.some((n) => n.optional === true || n.level || n.reviewStatus === 'draft')) {
    items.push({
      id: 'label',
      sample: { kind: 'label' },
      text: 'надпись на узле: уровень, необязательное, не проверено куратором, своё',
    });
  }
  if (input.grouped) {
    items.push({
      id: 'stage',
      sample: { kind: 'stage' },
      text: 'блок этапа: название, область, сколько освоено; нажмите, чтобы раскрыть',
    });
    // Стрелки-счётчики рисуются без выбора, призраки — только вместе с выбранным понятием.
    if (!input.selected) {
      items.push({
        id: 'count',
        sample: { kind: 'count' },
        text: 'число на стрелке: сколько связей между этапами; нажмите, чтобы увидеть список',
      });
    } else {
      items.push({
        id: 'ghost',
        sample: { kind: 'ghost' },
        text: 'пунктирный бледный узел: сосед выбранного из свёрнутого этапа',
      });
    }
  }
  return items;
}
