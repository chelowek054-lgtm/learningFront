// Перевод без React: язык и словари живут здесь, чтобы чистая логика (модели) и тесты не тянули ни React, ни expo.
import { deviceLocale, lookup, pickLanguage, type Lang, type Params } from './core';
import { en } from './en';
import { ru, type Key } from './ru';

export const dictionaries = { en, ru } as const;

// Текущий язык для кода вне компонентов; компоненты перерисовываются через контекст (i18n-context).
let current: Lang = pickLanguage(deviceLocale());

export const currentLang = (): Lang => current;

export function setCurrentLang(lang: Lang): void {
  current = lang;
}

/** Перевод без хука: для моделей, которые собирают строки (next-action, легенда). */
export function translate(key: Key, params?: Params): string {
  return lookup(dictionaries, current, key, params);
}
