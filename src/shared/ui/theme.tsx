// Тема: провайдер + хук. Значения берутся из shared/config/design.ts — здесь
// только выбор палитры и переключение режима.
//
// Три режима, а не два: `system` следует за устройством, `light`/`dark` — явный
// выбор пользователя, который переживает перезапуск.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeMode, setThemeMode, type ThemeMode } from '@/shared/api';
import {
  darkPalette,
  fontSize,
  fontWeight,
  lightPalette,
  lineHeightRatio,
  radii,
  spacing,
  type Palette,
} from '@/shared/config';

export type { ThemeMode };

export interface Theme {
  colors: Palette;
  dark: boolean;
  /** Что выбрано пользователем (может быть `system`). */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    void getThemeMode().then(setModeState);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setThemeMode(next);
  }, []);

  const value = useMemo<Theme>(() => {
    const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return { colors: dark ? darkPalette : lightPalette, dark, mode, setMode };
  }, [mode, system, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme: отсутствует <ThemeProvider>');
  return value;
}

// Реэкспорт токенов под привычными именами — чтобы экраны тянули всё из shared/ui.
export const space = spacing;
export const radius = radii;
export const font = fontSize;
export { fontWeight, lineHeightRatio };
export type { Palette };
