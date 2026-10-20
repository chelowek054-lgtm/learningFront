// Пробелы в графе (T-0084): подписи и расчёты без сети и без UI.
import type { GapFillResult, GapFillStatus, SourceGap } from '@/shared/api';
import { translate } from '../../../shared/i18n-core';

export const FILL_LABEL: Record<GapFillStatus, string> = {
  get queued() {
    return translate('sourcesGapsModel.1');
  },
  get nothing_found() {
    return translate('sourcesGapsModel.2');
  },
  get nothing_queued() {
    return translate('sourcesGapsModel.3');
  },
  get already_running() {
    return translate('sourcesGapsModel.4');
  },
  get bad_query() {
    return translate('sourcesGapsModel.5');
  },
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
  return r.queued.length > 0
    ? translate('sourcesGapsModel.6', { base, length: r.queued.length })
    : base;
}
