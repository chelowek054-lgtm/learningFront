// Выбор способа для шага изучения: чистая логика без сети и UI (T-0063).
import type { StudyMethodChoice, StudyMethodOption } from '@/shared/api';

/** Шаг, для которого человеку сейчас предлагается выбор. */
export const REMEMBER_PURPOSE = 'remember';

/** Способы шага из числа входящих в курс; выбирать есть из чего, только если их больше одного. */
export function optionsFor(choice: StudyMethodChoice, purpose: string): StudyMethodOption[] {
  return choice.options.filter((o) => o.purpose === purpose && o.inCourse);
}

/** Выбранный способ шага; без явного выбора — первый из предложенных (так же решает сервер). */
export function activeMethod(choice: StudyMethodChoice, purpose: string): string | null {
  const options = optionsFor(choice, purpose);
  const picked = choice.preferred[purpose];
  if (picked && options.some((o) => o.id === picked)) return picked;
  return options[0]?.id ?? null;
}

export function canChoose(choice: StudyMethodChoice, purpose: string): boolean {
  return optionsFor(choice, purpose).length > 1;
}
