// Интерфейс на двух языках (V-0140, R-0081, T-0177…T-0179): словари совпадают, множественное число
// верно, ошибка сервера показывается фразой нужного языка по коду.
import { describe, expect, it, vi } from 'vitest';

import { ApiError, NetworkError } from '../api/http';
import { errorText } from '../api/error-text';
import { pluralCategory, render, type Entry } from './core';
import { en } from './en';
import { ru } from './ru';
import { setCurrentLang } from './translate';

vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.0.0' } } }));
vi.mock('../api/token', () => ({ getToken: async () => null }));

const entries = (d: Record<string, Entry>) => Object.entries(d);
const text = (e: Entry) => (typeof e === 'string' ? e : Object.values(e).join(' '));
const params = (e: Entry) =>
  [...new Set([...text(e).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

describe('словари ru и en', () => {
  it('содержат одни и те же ключи', () => {
    const a = Object.keys(ru).sort();
    const b = Object.keys(en).sort();
    expect(a.filter((k) => !(k in en))).toEqual([]);
    expect(b.filter((k) => !(k in ru))).toEqual([]);
  });

  it('используют одни и те же параметры подстановки', () => {
    const bad = entries(ru as Record<string, Entry>)
      .filter(
        ([k, v]) =>
          JSON.stringify(params(v)) !== JSON.stringify(params((en as Record<string, Entry>)[k])),
      )
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('английский словарь без русских букв', () => {
    const bad = entries(en as Record<string, Entry>)
      .filter(([, v]) => /[А-Яа-яЁё]/.test(text(v)))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('множественные формы русского заданы полностью, английского — one и other', () => {
    for (const [k, v] of entries(ru as Record<string, Entry>)) {
      if (typeof v !== 'string')
        expect(Object.keys(v), k).toEqual(expect.arrayContaining(['one', 'few', 'many']));
    }
    for (const [k, v] of entries(en as Record<string, Entry>)) {
      if (typeof v !== 'string')
        expect(Object.keys(v), k).toEqual(expect.arrayContaining(['one', 'other']));
    }
  });
});

describe('множественное число', () => {
  const days = (ru as Record<string, Entry>)['m.streakDays'];
  it('русский: 1, 2, 5, 11, 21', () => {
    const got = [1, 2, 5, 11, 21].map((n) => render(days, 'ru', { count: n }));
    expect(got).toEqual([
      '1 день подряд',
      '2 дня подряд',
      '5 дней подряд',
      '11 дней подряд',
      '21 день подряд',
    ]);
  });

  it('английский: one и other', () => {
    expect([1, 2, 5, 11, 21].map((n) => pluralCategory('en', n))).toEqual([
      'one',
      'other',
      'other',
      'other',
      'other',
    ]);
  });
});

describe('текст ошибки сервера по коду', () => {
  const body = (code: string, p: object = {}) =>
    JSON.stringify({ detail: 'по-русски', code, params: p });

  it('выбирает фразу языка интерфейса и подставляет параметры', () => {
    const e = new ApiError(422, body('lang_unsupported', { lang: 'xx' }));
    expect(e.code).toBe('lang_unsupported');
    setCurrentLang('ru');
    expect(errorText(e)).toBe('Язык «xx» не поддерживается.');
    setCurrentLang('en');
    expect(errorText(e)).toBe('The language “xx” is not supported.');
    setCurrentLang('ru');
  });

  it('без кода — по статусу, затем общая фраза; сырой текст сервера не показывается', () => {
    setCurrentLang('en');
    expect(errorText(new ApiError(401, 'x'))).toBe('Please sign in again.');
    expect(errorText(new ApiError(500, '{"detail":"Внутренняя"}'))).toBe(
      'The request failed. Try again.',
    );
    expect(errorText(new NetworkError('http://x', new Error('boom')))).toBe(
      'No connection to the server.',
    );
    setCurrentLang('ru');
  });

  it('неизвестный код не ломает показ ошибки', () => {
    expect(errorText(new ApiError(400, body('no_such_code')))).toBe(
      'Не удалось выполнить запрос. Попробуйте ещё раз.',
    );
  });
});
