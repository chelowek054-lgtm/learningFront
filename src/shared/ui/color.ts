// Операции над цветом `#RRGGBB`: в React Native нет color-mix, поэтому смешиваем сами.

/** Цвет с прозрачностью 0–1 → `#RRGGBBAA`. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex}${a}`;
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Непрозрачная смесь: `share` доли цвета `fg` поверх `bg` — то же, что color-mix(in srgb) в макете. */
export function mixColors(fg: string, bg: string, share: number): string {
  const t = Math.min(1, Math.max(0, share));
  const f = channels(fg);
  const b = channels(bg);
  return (
    '#' +
    f
      .map((c, i) =>
        Math.round(c * t + b[i]! * (1 - t))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}
