// Что показать, пока граф собирается в фоне: по статусу профиля, без сети и без UI.
import type { ProfileState } from '@/shared/api';

export type BuildKind = 'idle' | 'running' | 'stale' | 'failed' | 'done';

export interface BuildView {
  kind: BuildKind;
  /** Сколько минут идёт сборка; только для running. */
  minutes: number;
  message: string;
}

export const POLL_MS = 5000;

/** Сборка не завершена — стоит опрашивать сервер дальше. */
export const isPending = (state: ProfileState | null): boolean =>
  state?.status === 'building' && !state.stale;

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
    return {
      kind: 'running',
      minutes,
      message:
        'Составляем полный перечень того, что нужно знать, и раскладываем его по областям и этапам. ' +
        'Обычно это 5–10 минут; экран можно закрыть — сборка продолжится.',
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
