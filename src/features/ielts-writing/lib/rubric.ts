// Рубрика письма по типу Activity: тип задания выбирает сервер по предмету,
// клиент только отправляет работу на ту рубрику, что соответствует типу.
const RUBRIC_BY_TYPE: Record<string, string> = {
  ielts_writing_task2: 'ielts_writing_task2',
  ielts_writing_task1: 'ielts_writing_task1',
  toefl_writing_independent: 'toefl_writing_independent',
  toefl_writing_integrated: 'toefl_writing_integrated',
};

/** Рубрика оценки для типа письма; неизвестный тип — рубрика IELTS Task 2, как раньше. */
export function writingRubricId(activityType: string): string {
  return RUBRIC_BY_TYPE[activityType] ?? 'ielts_writing_task2';
}

/** Мгновенный черновой сигнал построен по критериям IELTS — для TOEFL его не показываем. */
export function hasLocalDraftSignal(activityType: string): boolean {
  return writingRubricId(activityType) === 'ielts_writing_task2';
}
