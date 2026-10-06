// Настройка уведомлений вне приложения (T-0086): что показать и что делает кнопка. Без сети и без UI.
import type { PushState } from '@/shared/api';

export type FailureReason = 'unsupported' | 'denied' | 'no_project' | 'failed';
export type PushAction = 'enable' | 'disable' | null;

export interface PushView {
  label: string;
  hint: string;
  action: PushAction;
  actionLabel: string;
}

const FAILURE_HINT: Record<FailureReason, string> = {
  unsupported: 'Уведомления работают только на телефоне в установленной сборке приложения.',
  denied:
    'Доступ к уведомлениям не разрешён. Разрешите его в настройках телефона и включите снова.',
  no_project:
    'Эта сборка приложения не умеет получать уведомления: нужна сборка через EAS. Курс по-прежнему виден в приложении.',
  failed: 'Не удалось включить уведомления. Попробуйте ещё раз позже.',
};

/** Состояние карточки: по данным сервера, возможностям устройства и последней неудаче. */
export function describePush(
  server: PushState | null,
  supported: boolean,
  failure: FailureReason | null,
): PushView {
  if (!supported) {
    return { label: 'Недоступно', hint: FAILURE_HINT.unsupported, action: null, actionLabel: '' };
  }
  if (server && !server.available) {
    return {
      label: 'Недоступно',
      hint: 'Сервер пока не рассылает уведомления.',
      action: null,
      actionLabel: '',
    };
  }
  if (server?.enabled && server.devices > 0) {
    return {
      label: 'Включены',
      hint: 'Сообщим, когда курс готов, дополнен или понятие проверено. В тексте только вид и область.',
      action: 'disable',
      actionLabel: 'Отключить',
    };
  }
  return {
    label: server && server.devices > 0 ? 'Отключены' : 'Выключены',
    hint: failure
      ? FAILURE_HINT[failure]
      : 'Присылать уведомление, когда курс готов или дополнен, даже если приложение закрыто.',
    action: 'enable',
    actionLabel: 'Включить',
  };
}
