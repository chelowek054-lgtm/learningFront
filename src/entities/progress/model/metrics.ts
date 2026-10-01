// Метрики эффективности обучения (T-0009, FR-UX-07, product-metrics.md).
// Всё считается из единого лога `response` и локальных карточек (инвариант №4):
// отдельной аналитики нет, а значит, метрики работают офлайн. Функции чистые —
// экран только приносит данные и показывает результат.
import type { Response, SrsCardRecord } from '@/shared/engine';

const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// ---- удержание ----

export interface Retention {
  /** Сколько повторений сделано всего. */
  reviews: number;
  /** Из них закончились срывом («Снова»). */
  lapses: number;
  /** Доля повторений без срыва; null, пока повторений не было. */
  rate: number | null;
}

/**
 * Доля повторений, после которых карточка не сорвалась. Журнала отдельных
 * повторений на устройстве нет, поэтому берутся счётчики FSRS в самих карточках:
 * это итог за всё время, а не динамика по неделям.
 */
export function retention(cards: SrsCardRecord[]): Retention {
  let reviews = 0;
  let lapses = 0;
  for (const c of cards) {
    reviews += num(c.fsrsState.reps);
    lapses += num(c.fsrsState.lapses);
  }
  return { reviews, lapses, rate: reviews > 0 ? Math.max(0, (reviews - lapses) / reviews) : null };
}

// ---- закрытие error-log ----

export interface ErrorLogClosure {
  /** Карточек, заведённых из ошибок. */
  total: number;
  /** Закреплённых: вышли из обучения и их повторяли не меньше двух раз. */
  settled: number;
  rate: number | null;
}

const REVIEW_STATE = 2;

export function errorLogClosure(cards: SrsCardRecord[]): ErrorLogClosure {
  const errors = cards.filter((c) => c.source === 'error_log');
  const settled = errors.filter(
    (c) => num(c.fsrsState.state) === REVIEW_STATE && num(c.fsrsState.reps) >= 2,
  ).length;
  return {
    total: errors.length,
    settled,
    rate: errors.length > 0 ? settled / errors.length : null,
  };
}

// ---- рост по рубрикам ----

export interface CriterionGrowth {
  name: string;
  max: number;
  first: number;
  last: number;
  delta: number;
}

export interface RubricGrowth {
  rubricId: string;
  /** Сколько оценённых работ по этой рубрике. */
  count: number;
  first: number | null;
  last: number | null;
  /** Изменение итогового балла; null, пока работ меньше двух. */
  delta: number | null;
  criteria: CriterionGrowth[];
}

export function rubricGrowth(responses: Response[]): RubricGrowth[] {
  const byRubric = new Map<string, Response[]>();
  for (const r of responses) {
    if (!r.grade || r.grade.gradedOfflineFallback) continue; // черновой офлайн-сигнал — не оценка
    const list = byRubric.get(r.grade.rubricId) ?? [];
    list.push(r);
    byRubric.set(r.grade.rubricId, list);
  }

  const out: RubricGrowth[] = [];
  for (const [rubricId, list] of byRubric) {
    list.sort((a, b) => a.localCreatedAt.localeCompare(b.localCreatedAt));
    const firstGrade = list[0].grade!;
    const lastGrade = list[list.length - 1].grade!;
    const multiple = list.length > 1;

    const criteria: CriterionGrowth[] = multiple
      ? firstGrade.criteria.flatMap((c) => {
          const later = lastGrade.criteria.find((x) => x.name === c.name);
          return later
            ? [
                {
                  name: c.name,
                  max: later.max,
                  first: c.score,
                  last: later.score,
                  delta: later.score - c.score,
                },
              ]
            : [];
        })
      : [];

    out.push({
      rubricId,
      count: list.length,
      first: firstGrade.overall ?? null,
      last: lastGrade.overall ?? null,
      delta:
        multiple && firstGrade.overall !== undefined && lastGrade.overall !== undefined
          ? lastGrade.overall - firstGrade.overall
          : null,
      criteria,
    });
  }
  return out.sort((a, b) => b.count - a.count || a.rubricId.localeCompare(b.rubricId));
}

// ---- граница знаний ----

export interface KnownShare {
  known: number;
  total: number;
  rate: number;
}

/** Доля освоенных узлов среди узлов области; null, если карты нет или она пуста. */
export function knownShare(
  map: { nodes: { status: string }[] } | null | undefined,
): KnownShare | null {
  if (!map || map.nodes.length === 0) return null;
  const known = map.nodes.filter((n) => n.status === 'known').length;
  return { known, total: map.nodes.length, rate: known / map.nodes.length };
}

// ---- регулярность ----

/** Локальная календарная дата YYYY-MM-DD: серия считается по дням пользователя. */
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Длина серии ежедневных занятий. Серия жива, если занимались сегодня или вчера:
 * пока сегодняшний день не закончился, она не считается прерванной.
 */
export function streakDays(responses: Response[], now: Date = new Date()): number {
  const days = new Set(responses.map((r) => dayKey(new Date(r.localCreatedAt))));
  let cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
