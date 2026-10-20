// Выбор темы: чистая логика без react-native, чтобы проверяться тестами.
import type { ThemeName } from '@/shared/config';
import { translate } from '../i18n-core';

/** `system` следует за устройством; остальное — явный выбор человека. */
export type ThemeMode = 'system' | ThemeName;

const THEME_LABEL_KEYS = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
  oled: 'theme.oled',
  contrast: 'theme.contrast',
} as const;

export const THEME_MODES: readonly { mode: ThemeMode; label: string }[] = (
  ['system', 'light', 'dark', 'oled', 'contrast'] as const
).map((mode) => ({
  mode,
  // Подпись берётся при показе: язык интерфейса может смениться, пока экран открыт.
  get label() {
    return translate(THEME_LABEL_KEYS[mode]);
  },
}));

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
