// Что показать, пока граф собирается в фоне: по статусу профиля, без сети и без UI.
// Сборка идёт в две фазы (R-0055): быстрый контур, затем наполнение по областям.
import type { ProfileState } from '@/shared/api';

export type BuildKind = 'idle' | 'drafting' | 'outline' | 'running' | 'stale' | 'failed' | 'done';

export interface BuildView {
  kind: BuildKind;
  /** Сколько минут идёт текущая фаза; для drafting и running. */
  minutes: number;
  message: string;
}

export const POLL_MS = 5000;

/** Сборка не завершена — стоит опрашивать сервер дальше. */
export const isPending = (state: ProfileState | null): boolean =>
  state?.status === 'building' && !state.stale;

/** Есть ли что продолжать: контур уже составлен, тогда повтор не начинает с нуля. */
export const canResume = (state: ProfileState | null): boolean =>
  Boolean(state?.profile && state.profile.areas.length > 0);

export function buildView(state: ProfileState | null, now: number): BuildView {
  if (!state?.exists || state.status === null) return { kind: 'idle', minutes: 0, message: '' };
  if (state.status === 'building') {
    const started = state.updatedAt ? Date.parse(state.updatedAt) : now;
    const minutes = Math.max(0, Math.floor((now - started) / 60000));
    if (state.stale) {
      return {
        kind: 'stale',
        minutes,
        message: 'Сборка прервалась: сервер перезапускали. Запустите её заново.',
      };
    }
    if (!state.progress) {
      return {
        kind: 'drafting',
        minutes,
        message: 'Составляем контур навыка: из каких областей он состоит. Обычно около минуты.',
      };
    }
    return {
      kind: 'running',
      minutes,
      message:
        'Наполняем области: по каждой собираем всё, что нужно знать. Обычно 5–10 минут; ' +
        'экран можно закрыть — сборка продолжится.',
    };
  }
  if (state.status === 'outline') {
    return {
      kind: 'outline',
      minutes: 0,
      message: 'Контур готов. Проверьте состав навыка и соберите карту.',
    };
  }
  if (state.status === 'failed') {
    return {
      kind: 'failed',
      minutes: 0,
      message: state.error ?? 'Сборка не удалась. Попробуйте ещё раз.',
    };
  }
  return { kind: 'done', minutes: 0, message: '' };
}

/** «Идёт уже 3 мин» / «только началась». */
export const elapsedLabel = (minutes: number): string =>
  minutes < 1 ? 'только началась' : `идёт уже ${minutes} мин`;
