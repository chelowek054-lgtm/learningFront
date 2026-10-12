// Выбор темы: чистая логика без react-native, чтобы проверяться тестами.
import type { ThemeName } from '@/shared/config';

/** `system` следует за устройством; остальное — явный выбор человека. */
export type ThemeMode = 'system' | ThemeName;

export const THEME_MODES: readonly { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Как в системе' },
  { mode: 'light', label: 'Светлая' },
  { mode: 'dark', label: 'Тёмная' },
  { mode: 'oled', label: 'OLED' },
  { mode: 'contrast', label: 'Контрастная' },
];

/** Значение из хранилища → режим; неизвестное (в том числе от прежней версии) — `system`. */
export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return THEME_MODES.some((m) => m.mode === value) ? (value as ThemeMode) : 'system';
}

/** Имя темы для режима и системной схемы устройства. */
export function resolveThemeName(
  mode: ThemeMode,
  system: 'light' | 'dark' | null | undefined,
): ThemeName {
  if (mode !== 'system') return mode;
  return system === 'dark' ? 'dark' : 'light';
}
