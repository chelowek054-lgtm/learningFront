// Как показать отчёт по предварительным знаниям (T-0075, R-0042).
import type { AreaReport, PriorReport, Verdict } from '@/shared/api';

export const VERDICT_LABEL: Record<Verdict, string> = {
  enough: 'Хватает',
  partial: 'Мало',
  none: 'Нет',
  unchecked: 'Не проверено',
  no_graph: 'Нет в графе',
};

export const VERDICT_HINT: Record<Verdict, string> = {
  enough: 'Нужное для цели освоено — повторять не придётся.',
  partial: 'Часть нужного освоена, остальное курс добавит.',
  none: 'Из нужного пока ничего не освоено — курс начнётся отсюда.',
  unchecked: 'Вас здесь не спрашивали — курс исходит из того, что вы этого не знаете.',
  no_graph: 'Этой области в графе ещё нет: сверять не с чем, нужны источники.',
};

export const verdictTone = (v: Verdict): 'muted' | 'accent' | 'core' =>
  v === 'enough' ? 'core' : v === 'partial' ? 'accent' : 'muted';

const ORDER: Verdict[] = ['enough', 'partial', 'none', 'unchecked', 'no_graph'];

/** «Хватает: 2 · Мало: 1»; нулевые не показываем. */
export function summaryLine(summary: PriorReport['summary']): string {
  return ORDER.filter((v) => (summary[v] ?? 0) > 0)
    .map((v) => `${VERDICT_LABEL[v]}: ${summary[v]}`)
    .join(' · ');
}

/** Строка про область: сколько нужного понятий освоено. */
export function areaLine(a: Pick<AreaReport, 'needed' | 'known' | 'drafts' | 'verdict'>): string {
  if (a.verdict === 'no_graph') return 'в графе нет понятий';
  const base = a.needed > 0 ? `освоено ${a.known} из ${a.needed} нужных` : 'ничего не требуется';
  return a.drafts > 0 ? `${base} · черновых понятий: ${a.drafts}` : base;
}

/** Отчёт стоит показывать, только если по цели вообще есть базовые области. */
export const hasAreas = (r: PriorReport | null | undefined): r is PriorReport =>
  !!r && r.registered && r.areas.length > 0;
