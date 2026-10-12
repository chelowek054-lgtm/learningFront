// Раскладка навигации по ширине окна: чистая логика без react-native, чтобы проверяться тестами.
// Макет: телефон — вкладки внизу, планшет — рейка слева, десктоп — боковая панель.
import { grid } from '../config';

export { withAlpha } from './color';

export type NavLayout = 'bottom' | 'rail' | 'side';

/** Ширина панели навигации в dp; у нижней вкладочной панели её нет. */
export const NAV_WIDTH = { bottom: 0, rail: 96, side: 248 } as const;

/** До `md` — вкладки внизу, до `xl` — рейка, дальше — боковая панель. */
export function navLayoutFor(width: number): NavLayout {
  if (width < grid.breakpoints.md) return 'bottom';
  if (width < grid.breakpoints.xl) return 'rail';
  return 'side';
}

export interface NavItem {
  key: string;
  path: string;
  label: string;
  /** Служебный пункт: виден только администратору и стоит отдельно от основных. */
  adminOnly?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'index', path: '/', label: 'Сегодня' },
  { key: 'path', path: '/path', label: 'Путь' },
  { key: 'progress', path: '/progress', label: 'Прогресс' },
  { key: 'profile', path: '/profile', label: 'Профиль' },
  { key: 'curator', path: '/curator', label: 'Куратор', adminOnly: true },
];

/**
 * Пункты для показа. Нижняя панель держит только четыре основных: «Куратор» на телефоне
 * открывается из «Профиля», а не занимает вкладку.
 */
export function navItemsFor(layout: NavLayout, isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.adminOnly || (isAdmin && layout !== 'bottom'));
}

/**
 * Какой пункт навигации подсвечен на пути. Экраны вне вкладок относятся к ближайшей:
 * библиотека — к профилю, состав навыка и материалы — к пути, повторение и проверка уровня — к «Сегодня»,
 * служебные — к «Куратору». Неизвестный путь — ничего не подсвечено.
 */
export function navKeyForPath(pathname: string): string | null {
  const rules: [string, string][] = [
    ['/path', 'path'],
    ['/skill-profile', 'path'],
    ['/materials', 'path'],
    ['/progress', 'progress'],
    ['/profile', 'profile'],
    ['/library', 'profile'],
    ['/review', 'index'],
    ['/placement', 'index'],
    ['/curator', 'curator'],
    ['/sources', 'curator'],
    ['/activities', 'curator'],
  ];
  if (pathname === '/') return 'index';
  const hit = rules.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : null;
}

/** Нижняя панель на телефоне — только на самих вкладках; вложенные экраны занимают весь экран. */
export function showsBottomNav(pathname: string): boolean {
  return ['/', '/path', '/progress', '/profile'].includes(pathname);
}

/** Активен ли пункт для текущего пути: «/» только точно, остальные — и вложенные пути. */
export function isNavActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
