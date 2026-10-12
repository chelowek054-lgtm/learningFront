import { describe, expect, it, vi } from 'vitest';
import { Themes, typography, type ThemeColors } from './design';

// design.ts тянет react-native ради хука useColorScheme; в чистом тесте он не нужен.
vi.mock('react-native', () => ({ useColorScheme: () => 'light' }));

// Контраст по WCAG: пары, которые обязаны держать 4.5:1 в каждой теме.
function lum(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['accentText', 'surface'],
  ['onDanger', 'danger'],
];

describe('токены D-0001 (выгрузка консоли)', () => {
  it('есть четыре темы', () => {
    expect(Object.keys(Themes).sort()).toEqual(['contrast', 'dark', 'light', 'oled']);
  });
  it.each(Object.entries(Themes))('тема %s: основные пары держат 4.5:1', (_name, colors) => {
    for (const [fg, bg] of PAIRS) {
      expect(ratio(colors[fg], colors[bg]), `${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('подпись на акценте светлой темы белая — решение владельца, около 2.3:1', () => {
    const { accent, onAccent } = Themes.light;
    expect(onAccent).toBe('#FFFFFF');
    expect(ratio(onAccent, accent)).toBeLessThan(4.5);
  });
  it('шкала кеглей: 12, 13, 15, 17, 22, 28', () => {
    expect(
      [
        typography.caption,
        typography.small,
        typography.body,
        typography.lead,
        typography.title,
        typography.display,
      ].map((t) => t.fontSize),
    ).toEqual([12, 13, 15, 17, 22, 28]);
  });
});
