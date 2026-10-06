// Push-уведомления о курсе вне приложения (T-0086, R-0044): устройства и настройка.
import { api } from './http';

export interface PushState {
  devices: number;
  enabled: boolean;
  /** Включён ли канал на сервере: без него регистрировать устройство бессмысленно. */
  available: boolean;
}

export const getPushState = () => api<PushState>('/push');

export const registerPushDevice = (token: string, platform: string) =>
  api<PushState>('/push/devices', { method: 'POST', body: JSON.stringify({ token, platform }) });

export const removePushDevice = (token: string) =>
  api<{ removed: boolean }>('/push/devices/remove', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

export const setPushEnabled = (enabled: boolean) =>
  api<PushState>('/push/enabled', { method: 'POST', body: JSON.stringify({ enabled }) });
