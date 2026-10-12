// Как показать отчёт по предварительным знаниям (T-0075, R-0042).
import type { AreaReport, PriorReport, Verdict } from '@/shared/api';
import { translate } from '../../../shared/i18n/translate';

export const VERDICT_LABEL: Record<Verdict, string> = {
  get enough() {
    return translate('priorTestReport.1');
  },
  get partial() {
    return translate('priorTestReport.2');
  },
  get none() {
    return translate('priorTestReport.3');
  },
  get unchecked() {
    return translate('priorTestReport.4');
  },
  get no_graph() {
    return translate('priorTestReport.5');
  },
};

export const VERDICT_HINT: Record<Verdict, string> = {
  get enough() {
    return translate('priorTestReport.6');
  },
  get partial() {
    return translate('priorTestReport.7');
  },
  get none() {
    return translate('priorTestReport.8');
  },
  get unchecked() {
    return translate('priorTestReport.9');
  },
  get no_graph() {
    return translate('priorTestReport.10');
  },
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
  if (a.verdict === 'no_graph') return translate('priorTestReport.11');
  const base =
    a.needed > 0
      ? translate('priorTestReport.12', { known: a.known, needed: a.needed })
      : translate('priorTestReport.13');
  return a.drafts > 0 ? translate('priorTestReport.14', { base, drafts: a.drafts }) : base;
}

/** Отчёт стоит показывать, только если по цели вообще есть базовые области. */
export const hasAreas = (r: PriorReport | null | undefined): r is PriorReport =>
  !!r && r.registered && r.areas.length > 0;
