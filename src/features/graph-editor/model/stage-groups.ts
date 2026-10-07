// Карта по этапам (T-0093): узлы с этапом группируются в порядке этапов, остальные идут отдельно.
import type { GraphNode } from '@/shared/api';

export interface NodeGroup {
  title: string;
  nodes: GraphNode[];
}

export const hasStages = (nodes: GraphNode[]): boolean => nodes.some((n) => !!n.stage);

/** Этапы по возрасту порядкового номера, внутри — как пришли; узлы без этапа — группа «Прочее» в конце. */
export function groupByStage(nodes: GraphNode[]): NodeGroup[] {
  const staged = new Map<string, { order: number; nodes: GraphNode[] }>();
  const loose: GraphNode[] = [];
  for (const n of nodes) {
    if (!n.stage) {
      loose.push(n);
      continue;
    }
    const entry = staged.get(n.stage) ?? { order: n.stageOrder ?? 999, nodes: [] };
    entry.nodes.push(n);
    staged.set(n.stage, entry);
  }
  const groups = [...staged.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
    .map(([title, v]) => ({ title, nodes: v.nodes }));
  return loose.length > 0 ? [...groups, { title: 'Прочее', nodes: loose }] : groups;
}

export const LEVEL_TEXT = { basic: 'база', middle: 'средний', advanced: 'продвинутый' } as const;
