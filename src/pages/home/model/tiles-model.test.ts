import { describe, expect, it } from 'vitest';
import { moveId, orderTiles } from '../model/tiles-model';

describe('порядок плашек', () => {
  const tiles = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('сохранённый порядок применяется, новые плашки идут в конце', () => {
    expect(orderTiles(tiles, 'c,a').map((t) => t.id)).toEqual(['c', 'a', 'b']);
    expect(orderTiles(tiles, null).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('перестановка с соседней, границы не двигают', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});
