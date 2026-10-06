// Проверка предварительных знаний по базовым областям цели (T-0075, R-0042).
import { api } from './http';
import type { ProbeItem } from './graph-api';

const seg = (v: string) => encodeURIComponent(v);

/** хватает · мало · нет · не проверено · области нет в графе */
export type Verdict = 'enough' | 'partial' | 'none' | 'unchecked' | 'no_graph';

export interface AreaReport {
  key: string;
  title: string;
  level: number;
  verdict: Verdict;
  needed: number;
  known: number;
  answered: number;
  concepts: number;
  drafts: number;
}

export interface PriorReport {
  goal: string;
  registered: boolean;
  target: string;
  areas: AreaReport[];
  summary: Partial<Record<Verdict, number>>;
  missing?: string[];
  checked?: boolean;
}

export interface ChainProbe {
  conceptId: string;
  conceptTitle: string;
  domain: string;
  bloom: string;
  item: ProbeItem;
}

export type ChainStop = { done: true; reason: string; code: string };
export type ChainProbeResult = (ChainProbe & { done?: false }) | ChainStop;

export interface ChainAnswerResult {
  score: number;
  explanation: string;
  next: ChainProbe | null;
  done?: boolean;
  code?: string;
  report: PriorReport;
}

export const chainProbe = (domain: string, target: string) =>
  api<ChainProbeResult>(`/graph/placement/${seg(domain)}/chain-probe?target=${seg(target)}`);

export const chainAnswer = (
  domain: string,
  target: string,
  conceptId: string,
  bloom: string,
  answer: unknown,
) =>
  api<ChainAnswerResult>(`/graph/placement/${seg(domain)}/chain-answer?target=${seg(target)}`, {
    method: 'POST',
    body: JSON.stringify({ concept_id: conceptId, bloom, answer }),
  });

export const priorReport = (domain: string, target: string) =>
  api<PriorReport>(`/graph/placement/${seg(domain)}/report?target=${seg(target)}`);
