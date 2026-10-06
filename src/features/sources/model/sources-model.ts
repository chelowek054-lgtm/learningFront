// Источники знаний (T-0079): подписи и расчёты хода разбора без сети и без UI.
import type { IngestStatus, SourceFields, SourceItem, SourceProgress } from '@/shared/api';

export const STATUS_LABEL: Record<IngestStatus, string> = {
  new: 'Не поставлен в разбор',
  queued: 'В очереди на разбор',
  running: 'Разбирается',
  done: 'Разобран',
  failed: 'Ошибка разбора',
};

/** Доля готовых окон; у документа без окон — 0, у готового — 1. */
export function fraction(p: Pick<SourceProgress, 'status' | 'windows' | 'windowsDone'>): number {
  if (p.status === 'done') return 1;
  if (p.windows <= 0) return 0;
  return Math.min(1, p.windowsDone / p.windows);
}

/** «Окон 3 из 8 · найдено 12 понятий (12 черновиков)» — что админ видит под полосой прогресса. */
export function summaryLine(p: SourceProgress): string {
  const parts: string[] = [];
  if (p.windows > 0) parts.push(`окон ${p.windowsDone} из ${p.windows}`);
  if (p.concepts > 0) {
    const status =
      p.verified > 0 ? `${p.drafts} черновиков, ${p.verified} проверено` : `${p.drafts} черновиков`;
    parts.push(`понятий ${p.concepts} (${status})`);
  }
  if (p.dropped > 0) parts.push(`отброшено ${p.dropped} без подтверждения в тексте`);
  if (p.truncated) parts.push('разобрана только часть книги: достигнут лимит окон');
  return parts.join(' · ');
}

/** Пока хоть один документ в очереди или идёт разбор, список обновляется сам. */
export const shouldPoll = (items: SourceItem[]): boolean =>
  items.some((i) => i.progress.status === 'queued' || i.progress.status === 'running');

/** Можно ли загружать: область обязательна, без неё граф не знает, куда вносить понятия. */
export const canUpload = (fields: SourceFields): boolean => fields.domain.trim().length > 1;

/** Поля формы без пустых значений: пустое сервер не должен получать. */
export function cleanFields(raw: Record<keyof SourceFields, string>): SourceFields {
  const out: SourceFields = { domain: raw.domain.trim() };
  for (const key of ['title', 'level', 'license', 'originUrl'] as const) {
    const v = raw[key].trim();
    if (v) out[key] = v;
  }
  return out;
}

/** Что сказать после загрузки: новый документ или тот же файл ещё раз. */
export function uploadResult(r: { created: boolean; title: string; status: IngestStatus }): string {
  if (!r.created && r.status === 'done') {
    return `«${r.title}» уже разобран: повторная загрузка ничего не меняет.`;
  }
  if (!r.created) return `«${r.title}» уже загружен: ${STATUS_LABEL[r.status].toLowerCase()}.`;
  return `«${r.title}» загружен и поставлен в разбор.`;
}
