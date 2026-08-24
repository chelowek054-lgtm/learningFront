// Пользовательские настройки интерфейса (web): localStorage.
const THEME_KEY = 'praxis.theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

export async function getThemeMode(): Promise<ThemeMode> {
  if (typeof localStorage === 'undefined') return 'system';
  const value = localStorage.getItem(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, mode);
}
