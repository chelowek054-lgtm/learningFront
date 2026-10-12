// Текст ошибки на языке человека: сервер присылает код и параметры, клиент выбирает фразу (R-0081, T-0179).
import { translate } from '../i18n/translate';
import { ru, type Key } from '../i18n/ru';
import { ApiError, NetworkError } from './http';

const STATUS_KEYS: Record<number, Key> = {
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  413: 'errors.tooLarge',
};

/** Фраза по коду ошибки, затем по статусу, иначе общая; сырой текст сервера человеку не показывается. */
export function errorText(e: unknown, fallback: Key = 'errors.generic'): string {
  if (e instanceof NetworkError) return translate('errors.network');
  if (e instanceof ApiError) {
    const byCode = `errors.${e.code ?? ''}`;
    if (e.code && byCode in ru) {
      return translate(byCode as Key, (e.params ?? {}) as Record<string, string | number>);
    }
    const byStatus = STATUS_KEYS[e.status];
    if (byStatus) return translate(byStatus);
  }
  return translate(fallback);
}
