// Постановка цели как диалог (T-0061, R-0033): уточнение, пересказ, подтверждение.
// Граф области не строится, пока цель не подтверждена: подтверждение хранит сервер.
import { api } from './http';

export interface GoalQuestion {
  id: string;
  text: string;
}

/** Вопрос с ответом человека; `null` — пропущен, в пересказ не попадает. */
export interface GoalAnswer {
  question: string;
  answer: string | null;
}

/** Пересказ цели: «область, цель, уровень, пожелания». */
export interface GoalSummary {
  area: string;
  goal: string;
  level: string;
  wishes: string[];
}

export interface GoalIntakeState {
  confirmed: boolean;
  summary: GoalSummary | null;
}

const seg = (v: string) => encodeURIComponent(v);

/** 2–4 уточняющих вопроса к свободному вводу. Требует сети и модели. */
export const clarifyGoal = (text: string) =>
  api<{ questions: GoalQuestion[] }>('/graph/goal/clarify', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

export const summarizeGoal = (text: string, answers: GoalAnswer[]) =>
  api<GoalSummary>('/graph/goal/summarize', {
    method: 'POST',
    body: JSON.stringify({ text, answers }),
  });

/** Подтвердить пересказ по области: только после этого строится граф. */
export const confirmGoal = (domain: string, summary: GoalSummary) =>
  api<GoalIntakeState>('/graph/goal/confirm', {
    method: 'POST',
    body: JSON.stringify({ domain, ...summary }),
  });

export const getGoalIntake = (domain: string) =>
  api<GoalIntakeState>(`/graph/goal/intake/${seg(domain)}`);
