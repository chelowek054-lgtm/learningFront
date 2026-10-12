// Публичный API shared/i18n.
export { I18nProvider, useI18n } from './i18n-context';
export { currentLang, setCurrentLang, translate } from './translate';
export {
  DEFAULT_LANG,
  LANGUAGES,
  LANGUAGE_NAMES,
  deviceLocale,
  formatDate,
  formatNumber,
  isLang,
  lookup,
  pickLanguage,
  pluralCategory,
  render,
  type Lang,
  type Params,
} from './core';
export type { Key } from './ru';
