import { describe, expect, it, vi } from 'vitest';
import { isNavActive, navItemsFor, navLayoutFor, withAlpha } from './nav-layout';

vi.mock('react-native', () => ({ useColorScheme: () => 'light' }));

describe('navLayoutFor', () => {
  it('375 и 767 — вкладки внизу', () => {
    expect(navLayoutFor(375)).toBe('bottom');
    expect(navLayoutFor(767)).toBe('bottom');
  });
  it('768 и 834 — рейка', () => {
    expect(navLayoutFor(768)).toBe('rail');
    expect(navLayoutFor(834)).toBe('rail');
    expect(navLayoutFor(1199)).toBe('rail');
  });
  it('1200 и 1440 — боковая панель', () => {
    expect(navLayoutFor(1200)).toBe('side');
    expect(navLayoutFor(1440)).toBe('side');
  });
});

describe('navItemsFor', () => {
  it('«Куратор» только администратору и не на телефоне', () => {
    expect(navItemsFor('side', false).map((i) => i.key)).toEqual([
      'index',
      'path',
      'progress',
      'profile',
    ]);
    expect(navItemsFor('side', true).map((i) => i.key)).toContain('curator');
    expect(navItemsFor('rail', true).map((i) => i.key)).toContain('curator');
    expect(navItemsFor('bottom', true).map((i) => i.key)).not.toContain('curator');
  });
});

describe('isNavActive', () => {
  it('«/» только точно', () => {
    expect(isNavActive('/', '/')).toBe(true);
    expect(isNavActive('/', '/path')).toBe(false);
  });
  it('вложенный путь держит вкладку активной', () => {
    expect(isNavActive('/path', '/path')).toBe(true);
    expect(isNavActive('/path', '/path/step')).toBe(true);
    expect(isNavActive('/path', '/pathology')).toBe(false);
  });
});

describe('withAlpha', () => {
  it('добавляет канал прозрачности', () => {
    expect(withAlpha('#22C55E', 0.14)).toBe('#22C55E24');
    expect(withAlpha('#000000', 1)).toBe('#000000FF');
    expect(withAlpha('#000000', 0)).toBe('#00000000');
  });
});
