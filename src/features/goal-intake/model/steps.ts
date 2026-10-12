// Шаги онбординга (макет Claude Design): пять шагов от цели до сборки карты.
// Диалог цели закрывает первые три; состав навыка и сборка идут на своих экранах.

export const STEP_COUNT = 5;

export type DialogStage = 'ask' | 'clarify' | 'recap' | 'volume';

/** Номер шага по стадии диалога: объём пути — часть пересказа, отдельного шага нет. */
export function stepOf(stage: DialogStage): number {
  if (stage === 'ask') return 1;
  if (stage === 'clarify') return 2;
  return 3;
}

export const stepLabel = (n: number): string => `Шаг ${n} из ${STEP_COUNT}`;

/**
 * Почему уточнять нечем: нет связи с сервером или сервер/модель не ответили.
 * Тексты разные: «нет сети» лечится подключением, «помощник не ответил» — повтором.
 */
export type FailureKind = 'offline' | 'model';

export const failureKind = (isNetworkError: boolean): FailureKind =>
  isNetworkError ? 'offline' : 'model';

export const FAILURE_TEXT: Record<FailureKind, string> = {
  offline: 'Нет сети. Диалог с помощником недоступен — введите область и цель сами.',
  model: 'Помощник не ответил. Введите область и цель сами или попробуйте ещё раз позже.',
};
