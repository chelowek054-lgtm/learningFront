// Моя библиотека: предметы человека со статусом (T-0119, R-0062).
import { api } from './http';

export type SubjectStatus = 'building' | 'active' | 'paused' | 'reached';

export interface UserSubject {
  id: string;
  domain: string;
  title: string;
  target: string;
  status: SubjectStatus;
}

export const listSubjects = () => api<UserSubject[]>('/graph/subjects');

export const addSubject = (s: { domain: string; title: string; target: string }) =>
  api<UserSubject>('/graph/subjects', { method: 'POST', body: JSON.stringify(s) });

export const patchSubject = (id: string, patch: { status?: SubjectStatus; target?: string }) =>
  api<UserSubject>(`/graph/subjects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteSubject = (id: string) =>
  api<void>(`/graph/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' });
