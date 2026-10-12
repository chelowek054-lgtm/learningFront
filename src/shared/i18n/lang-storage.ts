// Хранение выбранного языка интерфейса (native). Web-вариант — lang-storage.web.ts.
import * as SecureStore from 'expo-secure-store';

import { isLang, type Lang } from './core';

const LANG_KEY = 'praxis.ui_lang';

export async function getStoredLang(): Promise<Lang | null> {
  try {
    const value = await SecureStore.getItemAsync(LANG_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLang(lang: Lang | null): Promise<void> {
  try {
    if (lang === null) await SecureStore.deleteItemAsync(LANG_KEY);
    else await SecureStore.setItemAsync(LANG_KEY, lang);
  } catch {
    /* язык не запомнился — вернётся язык устройства */
  }
}
