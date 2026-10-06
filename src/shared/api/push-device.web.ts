// Web: push через Expo не поддерживается; функции-заглушки с тем же интерфейсом.
import type { PushTokenResult } from './push-device';

export type { PushTokenResult } from './push-device';

export const obtainPushToken = async (): Promise<PushTokenResult> => ({
  ok: false,
  reason: 'unsupported',
});

export const pushSupported = (): boolean => false;

export const forgetPushDevice = async (): Promise<void> => undefined;
