// Язык интерфейса: провайдер и хук. Выбор человека запоминается на устройстве; пока его нет — язык устройства,
// иначе английский (R-0081, T-0178). Состояние для кода вне React — в translate.ts.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  formatDate,
  formatNumber,
  isLang,
  lookup,
  pickLanguage,
  deviceLocale,
  type Lang,
  type Params,
  Key,
} from '../i18n-core';
import { getStoredLang, setStoredLang } from './lang-storage';
import { currentLang, dictionaries, setCurrentLang } from '../i18n-core';

interface I18n {
  lang: Lang;
  /** Выбран ли язык вручную (иначе — язык устройства). */
  manual: boolean;
  setLang: (lang: Lang | null) => void;
  t: (key: Key, params?: Params) => string;
  date: (value: Date | string | number) => string;
  number: (value: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang());
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let alive = true;
    void getStoredLang().then((stored) => {
      if (!alive || !isLang(stored)) return;
      setCurrentLang(stored);
      setLangState(stored);
      setManual(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setLang = useCallback((next: Lang | null) => {
    const resolved = next ?? pickLanguage(deviceLocale());
    setCurrentLang(resolved);
    setLangState(resolved);
    setManual(next !== null);
    void setStoredLang(next);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      manual,
      setLang,
      t: (key, params) => lookup(dictionaries, lang, key, params),
      date: (v) => formatDate(lang, v),
      number: (v) => formatNumber(lang, v),
    }),
    [lang, manual, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n: отсутствует <I18nProvider>');
  return value;
}
