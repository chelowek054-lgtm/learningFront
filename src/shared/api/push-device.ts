// Токен устройства для push (native): разрешение, получение токена Expo и его запоминание, чтобы при
// выходе из аккаунта сообщить серверу «этому телефону больше не слать». Web-вариант — push-device.web.ts.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { removePushDevice } from './push-api';

const KEY = 'praxis.push_token';

export type PushTokenResult =
  | { ok: true; token: string; platform: string }
  | { ok: false; reason: 'unsupported' | 'denied' | 'no_project' | 'failed' };

/** Спросить разрешение и получить токен. Без согласия человека ничего не регистрируется. */
export async function obtainPushToken(): Promise<PushTokenResult> {
  if (!Device.isDevice || Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, reason: 'denied' };
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    // Без EAS-проекта (T-0034) токен Expo не выдаётся: честно говорим, чего не хватает.
    if (!projectId) return { ok: false, reason: 'no_project' };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await SecureStore.setItemAsync(KEY, data);
    return { ok: true, token: data, platform: Platform.OS };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export const pushSupported = (): boolean => Device.isDevice && Platform.OS !== 'web';

/** При выходе из аккаунта: убрать устройство на сервере и забыть токен. Сбой не мешает выходу. */
export async function forgetPushDevice(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(KEY);
    if (!token) return;
    await removePushDevice(token).catch(() => undefined);
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* токен не хранился или хранилище недоступно */
  }
}
