// Пользовательские настройки интерфейса (web): localStorage.
import { parseThemeMode, type ThemeMode } from './theme-mode';

const THEME_KEY = 'praxis.theme_mode';

export async function getThemeMode(): Promise<ThemeMode> {
  if (typeof localStorage === 'undefined') return 'system';
  const value = localStorage.getItem(THEME_KEY);
  return parseThemeMode(value);
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, mode);
}
