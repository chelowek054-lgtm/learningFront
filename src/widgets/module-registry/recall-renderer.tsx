// `concept_recall` показывают два разных задания: самостоятельное (вопрос в `payload.prompt`, оценка
// заданием `grade_concept`) и шаг курса (вопрос и критерии в `payload.item`, оценка идёт через
// `answerStep` и двигает освоенность и курс). Раньше шаг курса попадал на первый экран и показывал
// пустой вопрос — поэтому выбор вынесен сюда и покрыт тестом.
import type { ActivityRendererProps } from '@/shared/engine';
import { ConceptRecallActivity } from '@/features/concept-recall';
import { ConceptQuestionActivity } from '@/features/concept-study';

/** Задание из шага курса несёт `item` и идентификаторы понятия и области. */
export function isCourseStepPayload(payload: unknown): boolean {
  const p = (payload ?? {}) as { item?: unknown; domain?: unknown; conceptId?: unknown };
  return Boolean(p.item) && typeof p.domain === 'string' && typeof p.conceptId === 'string';
}

export function RecallRenderer(props: ActivityRendererProps) {
  return isCourseStepPayload(props.activity.payload) ? (
    <ConceptQuestionActivity {...props} />
  ) : (
    <ConceptRecallActivity {...props} />
  );
}
