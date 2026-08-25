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
  /**
   * Статус модерации канона: `draft` — построено LLM и куратор ещё не смотрел,
   * `approved` — вычитано. Отдельно от `status` выше: тот про персональный слой.
   */
  reviewStatus?: string;
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

/**
 * Сегмент пути. Домен приходит из названия предмета, которое ввёл человек:
 * без кодирования кириллица и пробелы ломали запрос. Раньше encodeURIComponent
 * стоял только на `target` в nextProbe — остальные интерполяции были без него.
 */
const seg = (v: string) => encodeURIComponent(v);

export const getGraph = (domain: string) => api<Graph>(`/graph/${seg(domain)}`);

/** Пустую область заводит любой пользователь; достройку существующей — только админ. */
export const buildCanon = (domain: string, topic: string) =>
  api<Graph>('/graph/canon/build', { method: 'POST', body: JSON.stringify({ domain, topic }) });

export const recomputeCentrality = (domain: string) =>
  api<CentralityRow[]>('/graph/canon/recompute-centrality', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });

export const approveNode = (conceptId: string, tier?: NodeTier) =>
  api(`/graph/canon/nodes/${seg(conceptId)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });

export const overrideNode = (baseConceptId: string, content: Record<string, unknown>) =>
  api(`/graph/nodes/${seg(baseConceptId)}/override`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const patchUserNode = (userConceptId: string, patch: Record<string, unknown>) =>
  api(`/graph/user-nodes/${seg(userConceptId)}`, { method: 'PUT', body: JSON.stringify(patch) });

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
/** Почему зондирование не началось — каждая причина требует своего действия. */
export type StopCode = 'empty' | 'no_theory' | 'settled';

export type ProbeResult =
  (Probe & { done?: false }) | { done: true; reason: string; code: StopCode; map: MasteryMap };

export interface AnswerResult {
  score: number;
  explanation: string;
  mastery: MasteryNode | Record<string, unknown>;
  next: Probe | null;
  done?: boolean;
  code?: StopCode;
}

export const nextProbe = (domain: string, target: string) =>
  api<ProbeResult>(`/graph/placement/${seg(domain)}/probe?target=${seg(target)}`);

export const answerProbe = (domain: string, conceptId: string, bloom: string, answer: unknown) =>
  api<AnswerResult>('/graph/placement/answer', {
    method: 'POST',
    body: JSON.stringify({ domain, concept_id: conceptId, bloom, answer }),
  });

export const masteryMap = (domain: string) =>
  api<MasteryMap>(`/graph/placement/${seg(domain)}/map`);

// ---- курс (KG5) ----

export interface CourseActivity {
  type: string;
  bloom: string;
  conceptId?: string;
  note?: string;
}

/** Почему узел попал в путь — это объяснение курса, а не отладочная метка. */
export type StepReason = 'rooting' | 'differentiation' | 'branch' | 'spiral';

export interface CourseStep {
  conceptId: string;
  title: string;
  tier: NodeTier;
  bloom: string;
  reason: StepReason;
  activities: CourseActivity[];
  done: boolean;
}

export interface Course {
  domain: string;
  target: { bloom: string; concepts: string[] };
  steps: CourseStep[];
  completed: number;
  total: number;
  current: CourseStep | null;
}

export const buildCourse = (domain: string, targetBloom: string) =>
  api<Course>(`/graph/course/${seg(domain)}`, {
    method: 'POST',
    body: JSON.stringify({ target_bloom: targetBloom }),
  });

export const getCourse = (domain: string) => api<Course>(`/graph/course/${seg(domain)}`);

export const completeStep = (domain: string, conceptId: string) =>
  api<Course>(`/graph/course/${seg(domain)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ concept_id: conceptId }),
  });

// ---- прохождение шага курса (KG5-05) ----

export interface StepActivity {
  id: string;
  type: string;
  connectivity: 'offline' | 'online';
  payload: Record<string, unknown>;
}

export interface StepResult {
  score: number;
  explanation: string;
  mastery: { estimate: number; confidence: number; observations: number };
  stepCompleted: boolean;
}

export const startStep = (domain: string, conceptId: string) =>
  api<{ conceptId: string; activities: StepActivity[] }>(
    `/graph/course/${seg(domain)}/step/${seg(conceptId)}/start`,
    { method: 'POST', body: JSON.stringify({}) },
  );

export const answerStep = (
  domain: string,
  conceptId: string,
  activityId: string,
  answer: unknown,
) =>
  api<StepResult>(`/graph/course/${seg(domain)}/step/${seg(conceptId)}/answer`, {
    method: 'POST',
    body: JSON.stringify({ activity_id: activityId, answer }),
  });

export const weakNodes = (domain: string) =>
  api<{ conceptId: string; title: string; estimate: number }[]>(
    `/graph/course/${seg(domain)}/weak`,
  );
