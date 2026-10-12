// Размеры контролов (D-0003, T-0139): основной «md» и малый «sm» для плотных блоков.
// Малый — компактный по виду, но зона нажатия остаётся не меньше 44 px за счёт hitSlop.

export type ControlSize = 'md' | 'sm';

/** Роль цвета малой кнопки: синий «нужно раньше», зелёный «открывает»; без роли — нейтральная. */
export type ControlTone = 'info' | 'ok';

export const MIN_TARGET = 44;

export const SMALL = {
  height: 32,
  paddingLeft: 10,
  paddingRight: 8,
  fontSize: 12.5,
  /** Шаг между малыми кнопками. */
  gap: 4,
} as const;

/** Невидимая подложка: добирает зону нажатия малого контрола до 44 px по высоте. */
export const SMALL_HIT_SLOP = {
  top: Math.ceil((MIN_TARGET - SMALL.height) / 2),
  bottom: Math.ceil((MIN_TARGET - SMALL.height) / 2),
  left: 2,
  right: 2,
} as const;
