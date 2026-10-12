// Переход по понятиям стрелками клавиатуры (T-0144): влево — к предпосылке, вправо — к тому, что открывает,
// вверх и вниз — между понятиями одной колонки. Чистая функция над раскладкой, без UI.
import type { GraphEdge } from '@/shared/api';
import type { SchemeLayout } from './scheme';

export type KeyDirection = 'left' | 'right' | 'up' | 'down';

export function neighborByKey(
  direction: KeyDirection,
  selected: string | null,
  edges: GraphEdge[],
  layout: SchemeLayout,
): string | null {
  const placed = Object.entries(layout.positions);
  if (placed.length === 0) return null;
  const sorted = [...placed].sort((a, b) => a[1].x - b[1].x || a[1].y - b[1].y);
  if (selected === null || !layout.positions[selected]) return sorted[0]![0];
  const here = layout.positions[selected]!;
  const byDistance = (ids: string[]) =>
    [...ids].sort(
      (a, b) =>
        Math.abs(layout.positions[a]!.y - here.y) - Math.abs(layout.positions[b]!.y - here.y) ||
        layout.positions[a]!.x - layout.positions[b]!.x,
    )[0] ?? null;

  if (direction === 'up' || direction === 'down') {
    const column = placed
      .filter(([, p]) => p.x === here.x)
      .sort((a, b) => a[1].y - b[1].y)
      .map(([id]) => id);
    const at = column.indexOf(selected);
    return column[direction === 'up' ? at - 1 : at + 1] ?? null;
  }

  const linked = edges
    .filter((e) => (direction === 'left' ? e.to === selected : e.from === selected))
    .map((e) => (direction === 'left' ? e.from : e.to))
    .filter((id) => layout.positions[id] !== undefined && id !== selected);
  const direct = byDistance(linked);
  if (direct) return direct;
  // Прямой связи нет — ближайшая колонка в этой стороне.
  const sideways = placed
    .filter(([, p]) => (direction === 'left' ? p.x < here.x : p.x > here.x))
    .map(([id]) => id);
  if (sideways.length === 0) return null;
  const nearestX = sideways.reduce(
    (best, id) => {
      const d = Math.abs(layout.positions[id]!.x - here.x);
      return d < best.d ? { d, id } : best;
    },
    { d: Infinity, id: sideways[0]! },
  ).d;
  return byDistance(
    sideways.filter((id) => Math.abs(layout.positions[id]!.x - here.x) === nearestX),
  );
}
