// Хранение выбранного языка интерфейса (web): localStorage.
import { isLang, type Lang } from './core';

const LANG_KEY = 'praxis.ui_lang';

export async function getStoredLang(): Promise<Lang | null> {
  try {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(LANG_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLang(lang: Lang | null): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') return;
    if (lang === null) localStorage.removeItem(LANG_KEY);
    else localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* язык не запомнился — вернётся язык устройства */
  }
}
