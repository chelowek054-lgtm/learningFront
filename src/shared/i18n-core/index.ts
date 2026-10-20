// Публичный API shared/i18n-core: перевод без React — для моделей, сервисов и тестов.
export { currentLang, dictionaries, setCurrentLang, translate } from './translate';
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
  type Dictionary,
  type Lang,
  type Params,
} from './core';
export { en } from './en';
export { ru, type Key } from './ru';
