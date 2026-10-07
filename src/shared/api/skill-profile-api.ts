// Профиль навыка (T-0095, T-0090, T-0099): что нужно знать для цели, правка человеком, построение графа.
import { api } from './http';

const seg = (v: string) => encodeURIComponent(v);

export type ConceptLevel = 'basic' | 'middle' | 'advanced';

export interface ProfileConcept {
  key: string;
  title: string;
  summary: string;
  stage: string | null;
  level: ConceptLevel | null;
  optional: boolean;
  prereqs: string[];
}

export interface ProfileStage {
  key: string;
  title: string;
  order: number;
}

export interface ProfileArea {
  key: string;
  title: string;
  summary: string;
  role: 'goal' | 'foundation';
  /** «Уже владею»: наполнение сводится к опорным понятиям (R-0055). */
  known?: boolean;
  weight: number;
  prereqs: string[];
  stages: ProfileStage[];
  concepts: ProfileConcept[];
}

export interface SkillProfile {
  skill: string;
  level: string;
  size: number;
  areas: ProfileArea[];
}

export type ProfileStatus = 'building' | 'outline' | 'draft' | 'confirmed' | 'failed';

export type AreaProgressState = 'waiting' | 'working' | 'done' | 'failed';

/** Ход наполнения по областям; есть только у сборки с понятиями (R-0056). */
export interface BuildProgress {
  phase: string;
  areas: Record<string, AreaProgressState>;
}

export interface ProfileState {
  exists: boolean;
  status: ProfileStatus | null;
  profile: SkillProfile | null;
  concepts?: number;
  error?: string | null;
  /** Когда статус менялся в последний раз; для «строится уже N мин». */
  updatedAt?: string | null;
  /** «Строится», но задача давно не двигалась (сервер перезапускали): можно запустить заново. */
  stale?: boolean;
  progress?: BuildProgress | null;
}

export interface BuildReport {
  created: number;
  reused: number;
  edges: number;
  links: number;
  domains: string[];
  sources: string[];
}

export interface AreaCoverage {
  key: string;
  title: string;
  total: number;
  found: number;
  verified: number;
  missing: string[];
  optionalMissing: number;
  coverage: number;
}

export interface CoverageReport {
  skill: string | null;
  areas: AreaCoverage[];
  summary: { total: number; verified: number; missing: number; coverage: number };
}

export const getProfile = (domain: string) => api<ProfileState>(`/graph/profile/${seg(domain)}`);

export const requestProfile = (domain: string) =>
  api<ProfileState>(`/graph/profile/${seg(domain)}`, { method: 'POST' });

/** Собрать граф по подтверждённой цели в фоне: ответ сразу, ход — через getProfile. */
export const startGraphBuild = (domain: string) =>
  api<ProfileState>(`/graph/profile/${seg(domain)}/start`, { method: 'POST' });

/** Подтвердить контур и собрать карту в фоне: понятия по областям параллельно, затем граф. */
export const fillGraph = (domain: string) =>
  api<ProfileState>(`/graph/profile/${seg(domain)}/fill`, { method: 'POST' });

export const saveProfile = (domain: string, profile: SkillProfile) =>
  api<ProfileState>(`/graph/profile/${seg(domain)}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });

export const buildFromProfile = (domain: string) =>
  api<ProfileState & { build: BuildReport }>(`/graph/profile/${seg(domain)}/build`, {
    method: 'POST',
  });

export const getCoverage = (domain: string) =>
  api<CoverageReport>(`/graph/profile/${seg(domain)}/coverage`);

/** Области с их статусом сборки в порядке контура; пусто, пока наполнение не началось. */
export function areaProgressItems(
  state: ProfileState | null,
): { key: string; title: string; status: AreaProgressState }[] {
  const progress = state?.progress;
  if (!progress || !state?.profile) return [];
  return state.profile.areas.map((a) => ({
    key: a.key,
    title: a.title,
    status: progress.areas[a.key] ?? 'waiting',
  }));
}
