// Ядро интернационализации (R-0081, T-0177): языки интерфейса, выбор по языку устройства, подстановка
// параметров и множественное число по правилам языка. Чистая логика без react-native — проверяется тестами.

export const LANGUAGES = ['en', 'ru'] as const;
export type Lang = (typeof LANGUAGES)[number];
export const DEFAULT_LANG: Lang = 'en';

export const LANGUAGE_NAMES: Record<Lang, string> = { en: 'English', ru: 'Русский' };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Язык по локали устройства («ru-RU» → ru); неподдерживаемая локаль — английский. */
export function pickLanguage(locale: string | null | undefined): Lang {
  const base = (locale ?? '').toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : DEFAULT_LANG;
}

/** Локаль устройства: Intl есть и в браузере, и в Hermes; без него — пусто. */
export function deviceLocale(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
  } catch {
    return null;
  }
}

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Entry = string | PluralForms;
export type Params = Record<string, string | number>;

/** Категория множественного числа по правилам языка: у русского one/few/many, у английского one/other. */
export function pluralCategory(lang: Lang, n: number): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(lang).select(n);
  } catch {
    return n === 1 ? 'one' : 'other';
  }
}

export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** Текст записи словаря: у множественной формы берётся нужная по `count`. */
export function render(entry: Entry, lang: Lang, params?: Params): string {
  if (typeof entry === 'string') return interpolate(entry, params);
  const count = Number(params?.count ?? 0);
  const form = entry[pluralCategory(lang, count)] ?? entry.other;
  return interpolate(form, params);
}

export type Dictionary<K extends string> = Record<K, Entry>;

/**
 * Перевод по ключу: язык, потом английский, потом сам ключ — незаведённая строка видна в интерфейсе,
 * но не роняет экран.
 */
export function lookup<K extends string>(
  dictionaries: Record<Lang, Dictionary<K>>,
  lang: Lang,
  key: K,
  params?: Params,
): string {
  const entry = dictionaries[lang]?.[key] ?? dictionaries[DEFAULT_LANG]?.[key];
  return entry === undefined ? key : render(entry, lang, params);
}

/** Форматирование даты и числа по языку интерфейса (R-0081). */
export function formatDate(lang: Lang, value: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(value),
    );
  } catch {
    return String(value);
  }
}

export function formatNumber(lang: Lang, value: number): string {
  try {
    return new Intl.NumberFormat(lang).format(value);
  } catch {
    return String(value);
  }
}
