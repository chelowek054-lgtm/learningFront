// Утверждения узла: источники для учащегося, жалоба «здесь ошибка» и пул проблем администратора
// (T-0154, T-0158, T-0166). Учащийся видит название, лицензию, место и ссылку; цитата приходит,
// только если лицензия позволяет её воспроизводить.
import { api } from './http';

export interface ClaimSourceRef {
  title: string;
  license: string | null;
  lang: string | null;
  tier: string | null;
  page: number | null;
  heading: string | null;
  url: string | null;
  /** Оригинал недоступен: ссылка помечена, атрибуция и сохранённый фрагмент остаются. */
  linkDead: boolean;
  quote: string | null;
}

export interface NodeClaim {
  id: string;
  kind: string;
  text: string;
  lang: string;
  asOf: string | null;
  reviewAfter: string | null;
  applicability: string | null;
  sources: ClaimSourceRef[];
}

const seg = (v: string) => encodeURIComponent(v);

export const getNodeClaims = (conceptId: string, lang: string) =>
  api<NodeClaim[]>(`/graph/nodes/${seg(conceptId)}/claims?lang=${seg(lang)}`);

export const reportClaim = (claimId: string, note?: string) =>
  api<{ ok: boolean }>(`/graph/claims/${seg(claimId)}/report`, {
    method: 'POST',
    body: JSON.stringify({ note: note?.trim() || null }),
  });

/** Утверждение в пуле проблем: текст на английском и его источники с цитатами. */
export interface ProblemClaim {
  id: string;
  text: string;
  kind: string;
  status: string;
  sources: {
    document: string;
    tier: string | null;
    page: number | null;
    heading: string | null;
    quote: string;
  }[];
}

export interface ClaimProblem {
  id: string;
  concept: string | null;
  conceptId: string;
  domain: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  a: ProblemClaim;
  b: ProblemClaim;
  createdAt: string | null;
}

export type ProblemResolution = 'a' | 'b' | 'both' | 'disputed' | 'outdated';

export const listProblems = (state: 'open' | 'resolved' = 'open') =>
  api<ClaimProblem[]>(`/graph/claims/problems?state=${state}`);

export const resolveProblem = (id: string, resolution: ProblemResolution, note?: string) =>
  api<{ id: string; status: string; resolution: string }>(
    `/graph/claims/problems/${seg(id)}/resolve`,
    { method: 'POST', body: JSON.stringify({ resolution, note: note?.trim() || null }) },
  );

export interface ClaimReports {
  claimId: string;
  text: string;
  concept: string | null;
  reports: number;
  notes: string[];
}

export const listReports = () => api<ClaimReports[]>('/graph/claims/reports');

export const rebuildDomain = (domain: string) =>
  api<{ jobId: string }>(`/graph/claims/rebuild?domain=${seg(domain)}`, { method: 'POST' });
