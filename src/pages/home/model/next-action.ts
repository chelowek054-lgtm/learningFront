// Что делать прямо сейчас — ровно одно действие.
//
// Раньше «Сегодня» показывал три конкурирующих списка (повторение, курс,
// задания) и нигде не объяснял, как они связаны: человек не знал, с чего
// начать и что будет, если пропустить. Приоритет решается здесь, а не вёрсткой.
import type { Course, CourseStep, StepReason } from '@/shared/api';

export type NextAction =
  | { kind: 'course'; step: CourseStep; reason: string }
  | { kind: 'review'; dueCount: number; reason: string }
  | { kind: 'placement'; reason: string }
  | { kind: 'subject'; reason: string };

/** Почему узел попал в путь — объяснение курса, а не отладочная метка. */
const STEP_REASON: Record<StepReason, string> = {
  rooting: 'Опора: без этого следующие темы не встанут',
  differentiation: 'Здесь легко перепутать соседние понятия',
  branch: 'Это то, ради чего вы начали',
  spiral: 'Возвращаемся глубже — второй виток по теме',
};

export function reasonForStep(reason: StepReason): string {
  return STEP_REASON[reason] ?? 'Следующий шаг вашего пути';
}

export function nextAction({
  hasSubject,
  course,
  dueCount,
}: {
  hasSubject: boolean;
  course: Course | null;
  dueCount: number;
}): NextAction {
  if (!hasSubject) {
    return { kind: 'subject', reason: 'Путь строится под предмет — начните с выбора' };
  }
  // Шаг курса идёт первым: он двигает вперёд, а повторение только удерживает.
  if (course?.current) {
    return { kind: 'course', step: course.current, reason: reasonForStep(course.current.reason) };
  }
  if (dueCount > 0) {
    return {
      kind: 'review',
      dueCount,
      reason: 'Интервал подошёл — сейчас повторение закрепит лучше всего',
    };
  }
  return {
    kind: 'placement',
    reason: 'Чтобы построить путь, нужно понять, откуда стартуем',
  };
}
