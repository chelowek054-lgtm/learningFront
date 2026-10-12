// Хранение режима темы (native). Web-вариант — theme-storage.web.ts.
// Не секреты, но SecureStore здесь просто доступное KV-хранилище: отдельной
// зависимости ради одной строки заводить незачем.
import * as SecureStore from 'expo-secure-store';

import { parseThemeMode, type ThemeMode } from './theme-mode';

const THEME_KEY = 'praxis.theme_mode';

export async function getThemeMode(): Promise<ThemeMode> {
  const value = await SecureStore.getItemAsync(THEME_KEY);
  return parseThemeMode(value);
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, mode);
}
