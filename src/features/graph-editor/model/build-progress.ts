// Что показать, пока граф собирается в фоне: по статусу профиля, без сети и без UI.
// Сборка идёт в две фазы (R-0055): быстрый контур, затем наполнение по областям.
import type { ProfileState } from '@/shared/api';
import { translate } from '../../../shared/i18n/translate';

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
        message: translate('graphEditorBuildProgress.1'),
      };
    }
    if (!state.progress) {
      return {
        kind: 'drafting',
        minutes,
        message: translate('graphEditorBuildProgress.2'),
      };
    }
    return {
      kind: 'running',
      minutes,
      message: translate('graphEditorBuildProgress.3') + translate('graphEditorBuildProgress.4'),
    };
  }
  if (state.status === 'outline') {
    return {
      kind: 'outline',
      minutes: 0,
      message: translate('graphEditorBuildProgress.5'),
    };
  }
  if (state.status === 'failed') {
    return {
      kind: 'failed',
      minutes: 0,
      message: state.error ?? translate('graphEditorBuildProgress.6'),
    };
  }
  return { kind: 'done', minutes: 0, message: '' };
}

/** «Идёт уже 3 мин» / «только началась». */
export const elapsedLabel = (minutes: number): string =>
  minutes < 1
    ? translate('graphEditorBuildProgress.7')
    : translate('graphEditorBuildProgress.8', { minutes });
