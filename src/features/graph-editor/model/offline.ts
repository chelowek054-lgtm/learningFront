// Офлайн-чтение схемы и очередь правок личного слоя (T-0118, R-0061).
// Последний загруженный граф лежит в localStorage (веб) или в памяти; правки, не дошедшие до сервера,
// ждут в очереди и уходят при следующей загрузке.
type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const mem = new Map<string, string>();

const store = (): Store | null => {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null;
  } catch {
    return null;
  }
};

export function saveCache(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  mem.set(key, raw);
  try {
    store()?.setItem(`praxis:${key}`, raw);
  } catch {
    /* не поместилось — читаем из памяти */
  }
}

export function loadCache<T>(key: string): T | null {
  try {
    const raw = mem.get(key) ?? store()?.getItem(`praxis:${key}`) ?? null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export interface PendingEdit {
  kind: 'add-node';
  domain: string;
  title: string;
  summary: string;
  linkTo?: string;
}

const QUEUE = 'graph-pending';
export const pendingEdits = (): PendingEdit[] => loadCache<PendingEdit[]>(QUEUE) ?? [];
export const queueEdit = (e: PendingEdit): void => saveCache(QUEUE, [...pendingEdits(), e]);
export const clearEdits = (): void => saveCache(QUEUE, []);
