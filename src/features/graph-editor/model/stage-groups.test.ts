import { describe, expect, it } from 'vitest';
import type { GraphNode } from '@/shared/api';
import { groupByStage, hasStages } from './stage-groups';

const node = (id: string, stage?: string, order?: number): GraphNode =>
  ({ id, title: id, stage: stage ?? null, stageOrder: order ?? null }) as unknown as GraphNode;

describe('карта по этапам', () => {
  it('без этапов группировки нет', () => {
    expect(hasStages([node('a'), node('b')])).toBe(false);
    expect(hasStages([node('a'), node('b', 'Основы', 1)])).toBe(true);
  });

  it('этапы идут по порядковому номеру, а не по порядку прихода', () => {
    const groups = groupByStage([
      node('x', 'Методы', 2),
      node('y', 'Основы', 1),
      node('z', 'Методы', 2),
    ]);
    expect(groups.map((g) => g.title)).toEqual(['Основы', 'Методы']);
    expect(groups[1].nodes.map((n) => n.id)).toEqual(['x', 'z']);
  });

  it('узлы без этапа собираются в конце', () => {
    const groups = groupByStage([node('a'), node('b', 'Основы', 1)]);
    expect(groups.map((g) => g.title)).toEqual(['Основы', 'Прочее']);
  });

  it('этап без номера уходит после нумерованных', () => {
    const groups = groupByStage([node('a', 'Без номера'), node('b', 'Первый', 1)]);
    expect(groups.map((g) => g.title)).toEqual(['Первый', 'Без номера']);
  });
});
