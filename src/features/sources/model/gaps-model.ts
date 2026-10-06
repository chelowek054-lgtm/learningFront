// Пробелы в графе (T-0084): подписи и расчёты без сети и без UI.
import type { GapFillResult, GapFillStatus, SourceGap } from '@/shared/api';

export const FILL_LABEL: Record<GapFillStatus, string> = {
  queued: 'поставлено в разбор',
  nothing_found: 'по белому списку ничего не найдено',
  nothing_queued: 'найдено, но ничего не поставлено (уже загружено или не скачалось)',
  already_running: 'разбор по области уже идёт',
  bad_query: 'запрос слишком короткий',
};

/** Запрос, который уйдёт на сервер: правка администратора или готовый запрос области. */
export const effectiveQuery = (gap: Pick<SourceGap, 'query'>, edited?: string): string =>
  edited !== undefined && edited.trim() !== '' ? edited.trim() : gap.query;

/** Область можно запускать, пока по ней не идёт разбор. */
export const canSearch = (gap: Pick<SourceGap, 'state'>): boolean => gap.state === 'idle';

/** Пока по какой-то области идёт разбор, список обновляется сам. */
export const gapsNeedPolling = (gaps: SourceGap[]): boolean =>
  gaps.some((g) => g.state === 'running');

/** Итог запуска по области: подпись и сколько документов поставлено. */
export function resultLine(r: Pick<GapFillResult, 'status' | 'queued'>): string {
  const base = FILL_LABEL[r.status];
  return r.queued.length > 0 ? `${base}: документов ${r.queued.length}` : base;
}
