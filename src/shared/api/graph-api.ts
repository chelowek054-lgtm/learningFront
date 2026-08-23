// Клиент API графа знаний (KG2). Ответы camelCase; тела запросов — snake (BaseModel на backend).
import { api } from './http';

export type NodeTier = 'core' | 'derived';
export type NodeKind = 'canonical' | 'personal';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  userConceptId: string | null;
  title: string;
  tier: NodeTier;
  centrality: number;
  content: { summary?: string } & Record<string, unknown>;
  bloomLevels: string[];
  difficulty: number;
  version: number;
  mastery: Record<string, unknown>;
  status: string;
  origin: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  kind: 'canonical' | 'personal';
}

export interface Graph {
  domain: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CentralityRow {
  id: string;
  title: string;
  tier: NodeTier;
  centrality: number;
  dependents: number;
  suggestedCore: boolean;
}

export const getGraph = (domain: string) => api<Graph>(`/graph/${domain}`);

export const buildCanon = (domain: string, topic: string) =>
  api<Graph>('/graph/canon/build', { method: 'POST', body: JSON.stringify({ domain, topic }) });

export const recomputeCentrality = (domain: string) =>
  api<CentralityRow[]>('/graph/canon/recompute-centrality', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });

export const approveNode = (conceptId: string, tier?: NodeTier) =>
  api(`/graph/canon/nodes/${conceptId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });

export const overrideNode = (baseConceptId: string, content: Record<string, unknown>) =>
  api(`/graph/nodes/${baseConceptId}/override`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const patchUserNode = (userConceptId: string, patch: Record<string, unknown>) =>
  api(`/graph/user-nodes/${userConceptId}`, { method: 'PUT', body: JSON.stringify(patch) });

export const expandNode = (conceptId: string, direction: string) =>
  api<Graph>('/graph/expand', {
    method: 'POST',
    body: JSON.stringify({ concept_id: conceptId, direction }),
  });

// ---- адаптивный плейсмент (KG4) ----

export interface ProbeOption {
  text: string;
  correct: boolean;
  why: string;
}

export interface ProbeItem {
  prompt: string;
  expected: string;
  options: ProbeOption[];
  criteria: string[];
  grounded_in: string;
}

export interface Probe {
  conceptId: string;
  conceptTitle: string;
  bloom: string;
  uncertainty: number;
  item: ProbeItem;
}

export interface MasteryNode {
  conceptId: string;
  title: string;
  tier: NodeTier;
  status: 'locked' | 'frontier' | 'learning' | 'known';
  estimate: number;
  confidence: number;
  observations: number;
  bloom_reached: string | null;
}

export interface MasteryMap {
  domain: string;
  nodes: MasteryNode[];
  summary: Record<string, number>;
  coreCovered: boolean;
}

/** Зонд либо признак, что граница исчерпана. */
export type ProbeResult = (Probe & { done?: false }) | { done: true; reason: string; map: MasteryMap };

export interface AnswerResult {
  score: number;
  explanation: string;
  mastery: MasteryNode | Record<string, unknown>;
  next: Probe | null;
  done?: boolean;
}

export const nextProbe = (domain: string, target: string) =>
  api<ProbeResult>(`/graph/placement/${domain}/probe?target=${encodeURIComponent(target)}`);

export const answerProbe = (domain: string, conceptId: string, bloom: string, answer: unknown) =>
  api<AnswerResult>('/graph/placement/answer', {
    method: 'POST',
    body: JSON.stringify({ domain, concept_id: conceptId, bloom, answer }),
  });

export const masteryMap = (domain: string) => api<MasteryMap>(`/graph/placement/${domain}/map`);
