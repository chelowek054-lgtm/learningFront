// Сгенерировано консолью DocDD из токенов дизайна v1.9.0 (docs/16-design-system.md). Не правьте руками: меняются токены.
// Размеры — rem × 16: у React Native нет rem, а масштаб шрифта системы остаётся включённым.
import { useColorScheme } from 'react-native';

export const LightColors = {
  bg: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEFF7',
  ink: '#0F1530',
  muted: '#566079',
  line: '#D8DDEA',
  accent: '#22C55E',
  accentText: '#15703A',
  onAccent: '#FFFFFF',
  core: '#7336DE',
  ok: '#15703A',
  info: '#1F57D6',
  warn: '#96520C',
  danger: '#C0261E',
  onDanger: '#FFFFFF',
  focus: '#15803D',
  shadow: '#0F1530',
} as const;

export const DarkColors = {
  bg: '#0E111A',
  surface: '#161A25',
  surfaceAlt: '#202636',
  ink: '#E8EBF5',
  muted: '#9AA3BC',
  line: '#2C3345',
  accent: '#4ADE80',
  accentText: '#4ADE80',
  onAccent: '#04150B',
  core: '#A890F5',
  ok: '#4ADE80',
  info: '#6BA8F5',
  warn: '#F2C14E',
  danger: '#F08080',
  onDanger: '#2A0A07',
  focus: '#4ADE80',
  shadow: '#000000',
} as const;

export const ContrastColors = {
  bg: '#000000',
  surface: '#0A0A0A',
  surfaceAlt: '#1A1A1A',
  ink: '#FFFFFF',
  muted: '#E0E0E0',
  line: '#FFFFFF',
  accent: '#FFE600',
  accentText: '#FFE600',
  onAccent: '#000000',
  core: '#FFB000',
  ok: '#00FF7F',
  info: '#80D8FF',
  warn: '#FFD54F',
  danger: '#FF8A80',
  onDanger: '#000000',
  focus: '#FFE600',
  shadow: '#000000',
} as const;

export const OledColors = {
  bg: '#000000',
  surface: '#090B10',
  surfaceAlt: '#12151D',
  ink: '#E8EBF5',
  muted: '#9AA3BC',
  line: '#232838',
  accent: '#4ADE80',
  accentText: '#4ADE80',
  onAccent: '#04150B',
  core: '#A890F5',
  ok: '#4ADE80',
  info: '#6BA8F5',
  warn: '#F2C14E',
  danger: '#F08080',
  onDanger: '#2A0A07',
  focus: '#4ADE80',
  shadow: '#000000',
} as const;

/** Роли без привязки к значениям темы: иначе тёмная палитра не присваивается типу светлой. */
export type ThemeColors = { -readonly [K in keyof typeof LightColors]: string };

export const Themes = {
  light: LightColors,
  dark: DarkColors,
  contrast: ContrastColors,
  oled: OledColors,
} as const;

export type ThemeName = keyof typeof Themes;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  pill: 1000,
  lg: 16,
} as const;

export const border = {
  thin: 1,
  thick: 2,
} as const;

export const icon = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/** Длительности, мс; при «уменьшить движение» в системе компонент обязан их обнулить. */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export const fonts = {
  body: "system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, \"Liberation Mono\", monospace",
} as const;

/** Длина строки в символах: ограничивайте ширину текстового блока. */
export const measure = 70;

export const typography = {
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  small: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  lead: { fontSize: 17, lineHeight: 25, fontWeight: '500' },
  title: { fontSize: 22, lineHeight: 32, fontWeight: '600' },
  display: { fontSize: 28, lineHeight: 41, fontWeight: '700' },
  kicker: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
} as const;

export const grid = {
  columns: 12,
  gutter: 24,
  breakpoints: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  },
  containers: {
    sm: 540,
    md: 720,
    lg: 960,
    xl: 1140,
    xxl: 1320,
  },
} as const;

/** Точка сетки для ширины экрана в dp: наибольшая из тех, что не больше ширины. */
export function breakpointFor(width: number): keyof typeof grid.breakpoints {
  const names = Object.keys(grid.breakpoints) as (keyof typeof grid.breakpoints)[];
  return names.filter((name) => grid.breakpoints[name] <= width).pop() ?? names[0]!;
}

export const i18n = {
  default: 'ru',
  fallback: 'en',
  locales: ['ru', 'en'],
} as const;

/** Палитра по имени темы; без имени — по системной теме, `null` из `useColorScheme()` — светлая. */
export function useThemeColors(name?: ThemeName): ThemeColors {
  const scheme = useColorScheme();
  return Themes[name ?? (scheme === 'dark' ? 'dark' : 'light')];
}
