import { describe, expect, it } from 'vitest';
import { parseThemeMode, resolveThemeName, THEME_MODES } from './theme-mode';

describe('parseThemeMode', () => {
  it('узнаёт все четыре темы и system', () => {
    for (const { mode } of THEME_MODES) expect(parseThemeMode(mode)).toBe(mode);
  });
  it('неизвестное и пустое значение — system', () => {
    expect(parseThemeMode('sepia')).toBe('system');
    expect(parseThemeMode(null)).toBe('system');
    expect(parseThemeMode(undefined)).toBe('system');
  });
});

describe('resolveThemeName', () => {
  it('system следует за устройством, null — светлая', () => {
    expect(resolveThemeName('system', 'dark')).toBe('dark');
    expect(resolveThemeName('system', 'light')).toBe('light');
    expect(resolveThemeName('system', null)).toBe('light');
  });
  it('явный выбор сильнее системной схемы', () => {
    expect(resolveThemeName('oled', 'light')).toBe('oled');
    expect(resolveThemeName('contrast', 'dark')).toBe('contrast');
  });
});
