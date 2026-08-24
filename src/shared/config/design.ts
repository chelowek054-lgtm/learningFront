// ЕДИНЫЙ КОНФИГ ОФОРМЛЕНИЯ. Меняйте значения здесь — весь интерфейс поедет за ними.
// Ничего, кроме этого файла, не должно объявлять цвет, размер шрифта или отступ.
//
// Контраст проверен на фонах своей темы: приглушённый текст держит ≈5:1, поэтому
// поверх него НЕ нужно накидывать opacity — раньше это давало двойное затемнение
// и текст переставал читаться.

/** Роли цвета. Именуются по смыслу, а не по оттенку: `accent`, а не `blue`. */
export interface Palette {
  /** Фон экрана. */
  bg: string;
  /** Фон карточек и панелей поверх `bg`. */
  surface: string;
  /** Второй уровень поверхности: плашки, дорожки прогресса. */
  surfaceAlt: string;
  /** Основной текст. */
  ink: string;
  /** Второстепенный текст: подписи, пояснения. Уже приглушён — opacity не нужен. */
  muted: string;
  /** Границы и разделители. */
  line: string;
  /** Действия, прогресс, активная вкладка. */
  accent: string;
  /** Текст на заливке акцентом. */
  onAccent: string;
  /** Фундаментальное ядро графа — смысловой цвет, не украшение (05 §2.1). */
  core: string;
  ok: string;
  warn: string;
  danger: string;
  /** Текст на заливке danger. */
  onDanger: string;
}

export const lightPalette: Palette = {
  bg: '#F4F6F4',
  surface: '#FFFFFF',
  surfaceAlt: '#E7ECE9',
  ink: '#141F1C',
  muted: '#516760',
  line: '#D3DCD7',
  accent: '#1B6552',
  onAccent: '#FFFFFF',
  core: '#835412',
  ok: '#256A41',
  warn: '#7B5911',
  danger: '#973024',
  onDanger: '#FFFFFF',
};

export const darkPalette: Palette = {
  bg: '#0E1412',
  surface: '#18211F',
  surfaceAlt: '#232F2C',
  ink: '#E6EDE9',
  muted: '#9CB0A8',
  line: '#334340',
  accent: '#6BC2A4',
  onAccent: '#08110E',
  core: '#E3AD68',
  ok: '#7CC79A',
  warn: '#E5BC74',
  danger: '#EE9384',
  onDanger: '#2A0F0A',
};

/** Шаг сетки. Отступы берутся отсюда, а не подбираются на глаз. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  pill: 999,
} as const;

/** Шкала кеглей. Промежуточных значений быть не должно. */
export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  lead: 17,
  title: 22,
  display: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Множитель межстрочного расстояния: сплошной текст должен дышать. */
export const lineHeightRatio = 1.45;

/** Толщина активного индикатора вкладки и подобных меток. */
export const markThickness = 3;
