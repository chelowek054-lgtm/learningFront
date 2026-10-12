// Что делать прямо сейчас — ровно одно действие.
//
// Раньше «Сегодня» показывал три конкурирующих списка (повторение, курс,
// задания) и нигде не объяснял, как они связаны: человек не знал, с чего
// начать и что будет, если пропустить. Приоритет решается здесь, а не вёрсткой.
import type { Course, CourseStep, ProfileState, StepReason } from '@/shared/api';
import { pluralCategory } from '../../../shared/i18n/core';
import { currentLang, translate } from '../../../shared/i18n/translate';

// Вид «Сегодня» по состоянию предмета (R-0057, user-flow-daily-loop): ни одно состояние не подменяется
// «Определить уровень» по умолчанию.
export type NextAction =
  | { kind: 'course'; step: CourseStep; reason: string }
  | { kind: 'review'; dueCount: number; reason: string }
  | { kind: 'placement'; reason: string }
  | { kind: 'subject'; reason: string }
  | { kind: 'building'; minutes: number; reason: string }
  | { kind: 'outline'; reason: string }
  | { kind: 'failed'; interrupted: boolean; reason: string }
  | { kind: 'build'; reason: string }
  | { kind: 'done'; reason: string }
  | { kind: 'goal'; reason: string }
  | { kind: 'paused'; reason: string }
  | { kind: 'loading'; reason: string };

/** Почему узел попал в путь — объяснение курса, а не отладочная метка. */
const STEP_REASON: Record<StepReason, string> = {
  rooting: translate('home.1'),
  differentiation: translate('home.2'),
  branch: translate('home.3'),
  spiral: translate('home.4'),
};

export function reasonForStep(reason: StepReason): string {
  return STEP_REASON[reason] ?? translate('home.5');
}

const MINUTE = 60000;

export function nextAction({
  hasSubject,
  course,
  dueCount,
  build = null,
  graphSize = null,
  now = Date.now(),
  paused = false,
  goalPending = false,
}: {
  hasSubject: boolean;
  course: Course | null;
  dueCount: number;
  /** Состояние сборки карты (профиль навыка); null — не загружено или не начиналась. */
  build?: ProfileState | null;
  /** Сколько понятий в карте предмета; null — ещё не знаем. */
  graphSize?: number | null;
  now?: number;
  /** Предмет поставлен на паузу в «Моей библиотеке». */
  paused?: boolean;
  /** Цель по предмету ещё ставится: диалог уточнений не закончен. */
  goalPending?: boolean;
}): NextAction {
  if (!hasSubject) {
    return { kind: 'subject', reason: translate('home.6') };
  }
  if (goalPending) {
    return { kind: 'goal', reason: translate('home.7') };
  }
  if (paused) {
    return { kind: 'paused', reason: translate('home.8') };
  }
  // Готовый путь не теряем из-за сбоя или повторной сборки: шаг курса важнее служебных состояний сборки.
  const hasPath = Boolean(course?.current);
  if (!hasPath && build?.status === 'building') {
    if (build.stale) {
      return {
        kind: 'failed',
        interrupted: true,
        reason: translate('home.9'),
      };
    }
    const started = build.updatedAt ? Date.parse(build.updatedAt) : now;
    const minutes = Math.floor((now - started) / MINUTE);
    return {
      kind: 'building',
      minutes: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
      reason: translate('home.10'),
    };
  }
  if (!hasPath && build?.status === 'failed') {
    return {
      kind: 'failed',
      interrupted: false,
      reason: build.error ?? translate('home.11'),
    };
  }
  if (!hasPath && build?.status === 'outline') {
    return { kind: 'outline', reason: translate('home.12') };
  }
  // Карты нет вовсе (и не строится): предлагаем собрать, а не определять уровень по пустоте.
  if (graphSize === 0 && !hasPath && dueCount === 0) {
    return { kind: 'build', reason: translate('home.13') };
  }
  // Шаг курса идёт первым: он двигает вперёд, а повторение только удерживает.
  if (course?.current) {
    return { kind: 'course', step: course.current, reason: reasonForStep(course.current.reason) };
  }
  if (dueCount > 0) {
    return {
      kind: 'review',
      dueCount,
      reason: translate('home.14'),
    };
  }
  // Состояние ещё не загружено или не загрузилось: не выдаём «Определить уровень» по неизвестности.
  if (graphSize === null && build === null && !course) {
    return { kind: 'loading', reason: translate('home.15') };
  }
  // Курс построен и весь пройден: цель достигнута, а не «идти некуда».
  if (course && course.total > 0 && course.completed >= course.total) {
    return { kind: 'done', reason: translate('home.16') };
  }
  return {
    kind: 'placement',
    reason: translate('home.17'),
  };
}

/** «6 карточек», «1 карточка», «2 карточки»: форма слова по числу. */
export function cardsWord(n: number): string {
  // Форма слова — по правилам языка интерфейса: у русского «карточка / карточки / карточек», у английского card / cards.
  const form = pluralCategory(currentLang(), n);
  if (form === 'one') return translate('home.18');
  if (form === 'few') return translate('home.19');
  return translate('home.20');
}
