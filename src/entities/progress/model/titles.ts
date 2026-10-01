// Названия рубрик для экрана: слаг рубрики человеку ничего не говорит (A-0018).
const TITLES: Record<string, string> = {
  ielts_writing_task2: 'Эссе IELTS',
  toefl_writing_independent: 'Эссе TOEFL',
  toefl_writing_integrated: 'Пересказ TOEFL',
  concept_check: 'Проверка понимания',
  ml_code_review: 'Ревью кода',
};

export function rubricTitle(rubricId: string): string {
  return TITLES[rubricId] ?? 'Другая работа';
}
