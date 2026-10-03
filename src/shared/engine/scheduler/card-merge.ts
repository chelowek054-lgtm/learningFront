// Слияние карточки повторения с нескольких устройств (T-0029, R-0019): побеждает более позднее
// ревью, а не более поздняя запись. То же правило, что на сервере (core/srs.py: review_key).

type CardState = Record<string, unknown> | null | undefined;

/** Время последнего ревью; карточка без ревью (или с мусором вместо даты) старше всех. */
function reviewedAt(state: CardState): number {
  const raw = state?.last_review;
  if (typeof raw !== 'string' || raw === '') return Number.NEGATIVE_INFINITY;
  const hasZone = /(Z|[+-]\d\d:?\d\d)$/.test(raw);
  const ms = Date.parse(hasZone ? raw : `${raw}Z`);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

const count = (state: CardState, key: string): number => {
  const v = Number(state?.[key]);
  return Number.isFinite(v) ? v : 0;
};

/** Сравнить состояния: >0 — первое свежее, <0 — второе, 0 — одинаковые. */
export function compareCardStates(a: CardState, b: CardState): number {
  const ta = reviewedAt(a);
  const tb = reviewedAt(b);
  if (ta !== tb) return ta > tb ? 1 : -1;
  const reps = count(a, 'reps') - count(b, 'reps');
  if (reps !== 0) return reps > 0 ? 1 : -1;
  const lapses = count(a, 'lapses') - count(b, 'lapses');
  return lapses === 0 ? 0 : lapses > 0 ? 1 : -1;
}

/** Нужно ли принять серверную версию вместо локальной: только если она строго свежее. */
export const serverVersionWins = (local: CardState, server: CardState): boolean =>
  compareCardStates(server, local) > 0;
