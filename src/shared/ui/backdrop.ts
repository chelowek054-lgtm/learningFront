// Подложка страницы из эталона дизайна (D-0002, поверхность `backdrop.page`, T-0148): два мягких пятна поверх фона.
// Нативные стеки консоль эти значения не выгружает, поэтому доли и роли продублированы здесь; в макете — те же.
import type { ViewStyle } from 'react-native';
import { Platform } from 'react-native';
import { withAlpha } from './color';
import type { ThemeName } from '@/shared/config';

interface Glow {
  /** Центр и размер пятна, % ширины и высоты экрана. */
  x: number;
  y: number;
  w: number;
  h: number;
  color: 'accent' | 'core';
  alpha: number;
}

const PAGE: readonly Glow[] = [
  { x: 0, y: 0, w: 60, h: 24, color: 'accent', alpha: 0.12 },
  { x: 100, y: 6, w: 50, h: 22, color: 'core', alpha: 0.1 },
];

/** Строка `radial-gradient(...)` для фона страницы; пятна красятся ролями темы, поэтому темнеют вместе с ней. */
export function backdropImage(colors: { accent: string; core: string }): string {
  return PAGE.map(
    (g) =>
      `radial-gradient(${g.w}% ${g.h}% at ${g.x}% ${g.y}%, ${withAlpha(colors[g.color], g.alpha)}, transparent)`,
  ).join(', ');
}

/** Стиль подложки: в OLED и контрастной теме её нет — там чистый фон важнее украшения. */
export function backdropStyle(
  name: ThemeName,
  colors: { accent: string; core: string },
): ViewStyle {
  if (name === 'oled' || name === 'contrast') return {};
  const image = backdropImage(colors);
  return (
    Platform.OS === 'web' ? { backgroundImage: image } : { experimental_backgroundImage: image }
  ) as ViewStyle;
}
