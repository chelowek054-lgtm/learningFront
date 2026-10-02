// Данные задания Task 1 (T-0017): график или таблица приходят в payload.data,
// картинка не нужна — клиент рисует их сам и поэтому они читаются и офлайн.

export interface TaskData {
  kind?: string;
  title?: string;
  unit?: string;
  categories: string[];
  series: { name: string; values: number[] }[];
}

/** payload приходит с сервера как есть: форму проверяем, а не доверяем. */
export function parseTaskData(raw: unknown): TaskData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<TaskData>;
  if (!Array.isArray(d.categories) || !Array.isArray(d.series) || d.series.length === 0)
    return null;
  const series = d.series
    .filter((s) => s && typeof s.name === 'string' && Array.isArray(s.values))
    .map((s) => ({
      name: s.name,
      values: s.values.map((v) => (Number.isFinite(v) ? Number(v) : 0)),
    }));
  if (series.length === 0) return null;
  return {
    kind: d.kind,
    title: typeof d.title === 'string' ? d.title : undefined,
    unit: typeof d.unit === 'string' ? d.unit : undefined,
    categories: d.categories.map(String),
    series,
  };
}

export interface BarRow {
  category: string;
  bars: { series: string; value: number; /** доля от максимума, 0..1 */ fraction: number }[];
}

/** Строки для столбчатой диаграммы: длина полосы — доля от наибольшего значения. */
export function barRows(data: TaskData): BarRow[] {
  const max = Math.max(0, ...data.series.flatMap((s) => s.values)) || 1;
  return data.categories.map((category, i) => ({
    category,
    bars: data.series.map((s) => {
      const value = s.values[i] ?? 0;
      return { series: s.name, value, fraction: Math.max(0, value) / max };
    }),
  }));
}

/** Слов в тексте: так же считает экзамен — по пробельным разделителям. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Не хватает до минимума; 0 — норма выполнена или минимум не задан. */
export function wordsShort(text: string, minWords: unknown): number {
  const min = typeof minWords === 'number' && minWords > 0 ? minWords : 0;
  return Math.max(0, min - countWords(text));
}
