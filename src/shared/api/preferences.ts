// Пользовательские настройки интерфейса (native). Web-вариант — preferences.web.ts.
// Не секреты, но SecureStore здесь просто доступное KV-хранилище: отдельной
// зависимости ради одной строки заводить незачем.
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'praxis.theme_mode';

/** `system` — следовать за устройством; остальное — явный выбор пользователя. */
export type ThemeMode = 'system' | 'light' | 'dark';

export async function getThemeMode(): Promise<ThemeMode> {
  const value = await SecureStore.getItemAsync(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, mode);
}
