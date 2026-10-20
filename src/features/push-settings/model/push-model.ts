// Настройка уведомлений вне приложения (T-0086): что показать и что делает кнопка. Без сети и без UI.
import type { PushState } from '@/shared/api';
import { translate } from '../../../shared/i18n-core';

export type FailureReason = 'unsupported' | 'denied' | 'no_project' | 'failed';
export type PushAction = 'enable' | 'disable' | null;

export interface PushView {
  label: string;
  hint: string;
  action: PushAction;
  actionLabel: string;
}

const FAILURE_HINT: Record<FailureReason, string> = {
  get unsupported() {
    return translate('pushSettingsPushModel.1');
  },
  get denied() {
    return translate('pushSettingsPushModel.2');
  },
  get no_project() {
    return translate('pushSettingsPushModel.3');
  },
  get failed() {
    return translate('pushSettingsPushModel.4');
  },
};

/** Состояние карточки: по данным сервера, возможностям устройства и последней неудаче. */
export function describePush(
  server: PushState | null,
  supported: boolean,
  failure: FailureReason | null,
): PushView {
  if (!supported) {
    return {
      label: translate('pushSettingsPushModel.5'),
      hint: FAILURE_HINT.unsupported,
      action: null,
      actionLabel: '',
    };
  }
  if (server && !server.available) {
    return {
      label: translate('pushSettingsPushModel.5'),
      hint: translate('pushSettingsPushModel.6'),
      action: null,
      actionLabel: '',
    };
  }
  if (server?.enabled && server.devices > 0) {
    return {
      label: translate('pushSettingsPushModel.7'),
      hint: translate('pushSettingsPushModel.8'),
      action: 'disable',
      actionLabel: translate('pushSettingsPushModel.9'),
    };
  }
  return {
    label:
      server && server.devices > 0
        ? translate('pushSettingsPushModel.10')
        : translate('pushSettingsPushModel.11'),
    hint: failure ? FAILURE_HINT[failure] : translate('pushSettingsPushModel.12'),
    action: 'enable',
    actionLabel: translate('pushSettingsPushModel.13'),
  };
}
