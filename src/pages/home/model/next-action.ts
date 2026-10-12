// Что делать прямо сейчас — ровно одно действие.
//
// Раньше «Сегодня» показывал три конкурирующих списка (повторение, курс,
// задания) и нигде не объяснял, как они связаны: человек не знал, с чего
// начать и что будет, если пропустить. Приоритет решается здесь, а не вёрсткой.
import type { Course, CourseStep, ProfileState, StepReason } from '@/shared/api';

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
  rooting: 'Опора: без этого следующие темы не встанут',
  differentiation: 'Здесь легко перепутать соседние понятия',
  branch: 'Это то, ради чего вы начали',
  spiral: 'Возвращаемся глубже — второй виток по теме',
};

export function reasonForStep(reason: StepReason): string {
  return STEP_REASON[reason] ?? 'Следующий шаг вашего пути';
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
    return { kind: 'subject', reason: 'Путь строится под предмет — начните с выбора' };
  }
  if (goalPending) {
    return { kind: 'goal', reason: 'Закончите постановку цели — по ней строится путь' };
  }
  if (paused) {
    return { kind: 'paused', reason: 'Предмет на паузе. Верните его в работу в «Моей библиотеке»' };
  }
  // Готовый путь не теряем из-за сбоя или повторной сборки: шаг курса важнее служебных состояний сборки.
  const hasPath = Boolean(course?.current);
  if (!hasPath && build?.status === 'building') {
    if (build.stale) {
      return {
        kind: 'failed',
        interrupted: true,
        reason: 'Сборка прервалась: сервер перезапускали. Запустите её заново.',
      };
    }
    const started = build.updatedAt ? Date.parse(build.updatedAt) : now;
    const minutes = Math.floor((now - started) / MINUTE);
    return {
      kind: 'building',
      minutes: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
      reason: 'Собираем всё, что нужно знать для вашей цели. Можно закрыть — сборка продолжится.',
    };
  }
  if (!hasPath && build?.status === 'failed') {
    return {
      kind: 'failed',
      interrupted: false,
      reason: build.error ?? 'Сборка не удалась. Попробуйте ещё раз.',
    };
  }
  if (!hasPath && build?.status === 'outline') {
    return { kind: 'outline', reason: 'Проверьте, из чего состоит навык, и соберите карту' };
  }
  // Карты нет вовсе (и не строится): предлагаем собрать, а не определять уровень по пустоте.
  if (graphSize === 0 && !hasPath && dueCount === 0) {
    return { kind: 'build', reason: 'Карты знаний по этому предмету ещё нет' };
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
  // Состояние ещё не загружено или не загрузилось: не выдаём «Определить уровень» по неизвестности.
  if (graphSize === null && build === null && !course) {
    return { kind: 'loading', reason: 'Загружаем состояние предмета…' };
  }
  // Курс построен и весь пройден: цель достигнута, а не «идти некуда».
  if (course && course.total > 0 && course.completed >= course.total) {
    return { kind: 'done', reason: 'Всё освоено до выбранного уровня' };
  }
  return {
    kind: 'placement',
    reason: 'Карта готова. Чтобы построить путь, нужно понять, откуда стартуем',
  };
}

/** «6 карточек», «1 карточка», «2 карточки»: форма слова по числу. */
export function cardsWord(n: number): string {
  const last = n % 10;
  const tens = n % 100;
  if (last === 1 && tens !== 11) return 'карточка';
  if (last >= 2 && last <= 4 && (tens < 12 || tens > 14)) return 'карточки';
  return 'карточек';
}
