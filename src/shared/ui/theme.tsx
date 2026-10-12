// Тема: провайдер + хук. Значения берутся из shared/config/design.ts — здесь
// только выбор палитры и переключение режима.
//
// Режим `system` следует за устройством; светлая, тёмная, OLED и контрастная —
// явный выбор человека, который переживает перезапуск.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { getThemeMode, setThemeMode } from './theme-storage';
import { resolveThemeName, type ThemeMode } from './theme-mode';
import {
  Themes,
  radius as radiusTokens,
  spacing,
  typography,
  type ThemeColors,
  type ThemeName,
} from '@/shared/config';

export type { ThemeMode };

export interface Theme {
  colors: ThemeColors;
  /** Имя действующей темы. */
  name: ThemeName;
  /** Тёмная ли поверхность: у dark, oled и contrast фон тёмный. */
  dark: boolean;
  /** Что выбрано человеком (может быть `system`). */
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
    const name = resolveThemeName(mode, system);
    return { colors: Themes[name], name, dark: name !== 'light', mode, setMode };
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
export const radius = radiusTokens;
/** Кегли по ролям шкалы; значения берутся из typography, а не заводятся заново. */
export const font = {
  caption: typography.caption.fontSize,
  small: typography.small.fontSize,
  body: typography.body.fontSize,
  lead: typography.lead.fontSize,
  title: typography.title.fontSize,
  display: typography.display.fontSize,
} as const;
export const fontWeight = {
  regular: typography.body.fontWeight,
  medium: typography.lead.fontWeight,
  semibold: typography.title.fontWeight,
  bold: typography.display.fontWeight,
} as const;
export type Palette = ThemeColors;
