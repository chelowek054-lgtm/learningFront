// Правка разбиения цели на субдомены до построения (T-0060, R-0032): человек видит
// предложение модели и может убрать лишнее или переименовать. Чистые функции, чтобы
// правка не оставляла «висячих» предпосылок на убранный субдомен.

export interface Subdomain {
  key: string;
  title: string;
  summary: string;
  prereqs: string[];
}

export interface BuildBudget {
  requests: number;
  subdomains: number;
  limit: number;
}

/** Убрать субдомен вместе со ссылками на него: без них сервер отбросил бы связь молча. */
export function removeSubdomain(list: Subdomain[], key: string): Subdomain[] {
  return list
    .filter((s) => s.key !== key)
    .map((s) => ({ ...s, prereqs: s.prereqs.filter((p) => p !== key) }));
}

export function renameSubdomain(list: Subdomain[], key: string, title: string): Subdomain[] {
  return list.map((s) => (s.key === key ? { ...s, title } : s));
}

/** Строить можно, пока остался хотя бы один субдомен с названием. */
export function canBuild(list: Subdomain[]): boolean {
  return list.some((s) => s.title.trim() !== '');
}

/** Что уйдёт на сервер: пустые названия отсекаются, а ссылки на них — тоже. */
export function toPayload(list: Subdomain[]): Subdomain[] {
  const kept = list.filter((s) => s.title.trim() !== '');
  const keys = new Set(kept.map((s) => s.key));
  return kept.map((s) => ({
    ...s,
    title: s.title.trim(),
    prereqs: s.prereqs.filter((p) => keys.has(p)),
  }));
}

/** Бюджет после правки: столько запросов к модели будет, сколько осталось субдоменов. */
export function budgetFor(list: Subdomain[], limit: number): BuildBudget {
  const n = toPayload(list).length;
  return { requests: n, subdomains: n, limit };
}

/** Порядок «что до чего» для показа: от тех, у кого нет предпосылок, к зависимым. */
export function orderByPrereqs(list: Subdomain[]): Subdomain[] {
  const placed = new Set<string>();
  const out: Subdomain[] = [];
  let rest = [...list];
  while (rest.length > 0) {
    const ready = rest.filter((s) =>
      s.prereqs.every((p) => placed.has(p) || !list.some((x) => x.key === p)),
    );
    // Цикл на клиенте не должен повесить экран: остаток идёт как есть.
    const batch = ready.length > 0 ? ready : rest;
    for (const s of batch) {
      out.push(s);
      placed.add(s.key);
    }
    rest = rest.filter((s) => !placed.has(s.key));
  }
  return out;
}
