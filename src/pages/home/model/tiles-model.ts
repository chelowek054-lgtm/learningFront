// Порядок плашек «Сегодня»: чистая логика без UI.
/** Плашки в порядке человека; новые, которых в сохранённом порядке нет, идут в конце. */
export function orderTiles<T extends { id: string }>(tiles: T[], saved: string | null): T[] {
  const ids = (saved ?? '').split(',').filter(Boolean);
  const rank = (id: string) => {
    const i = ids.indexOf(id);
    return i < 0 ? ids.length : i;
  };
  return [...tiles].sort((a, b) => rank(a.id) - rank(b.id));
}

/** Поменять плашку с соседней; границы списка ничего не меняют. */
export function moveId(ids: string[], id: string, delta: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
