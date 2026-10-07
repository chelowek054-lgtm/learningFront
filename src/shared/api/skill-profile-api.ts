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
