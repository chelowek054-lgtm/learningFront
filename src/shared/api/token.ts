// Хранилище JWT (native): expo-secure-store. Web-вариант — token.web.ts.
import * as SecureStore from 'expo-secure-store';

const KEY = 'praxis.access_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
