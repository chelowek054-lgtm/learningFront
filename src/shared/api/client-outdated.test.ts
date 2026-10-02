import { describe, expect, it, vi } from 'vitest';
import {
  ClientOutdatedError,
  notifyClientOutdated,
  onClientOutdated,
  parseOutdatedBody,
} from './client-outdated';

describe('parseOutdatedBody', () => {
  it('достаёт минимальную версию из ответа сервера', () => {
    expect(parseOutdatedBody('{"code":"client_outdated","minClientVersion":"1.2.0"}')).toBe(
      '1.2.0',
    );
  });

  it('тело не по форме не роняет разбор', () => {
    expect(parseOutdatedBody('not json')).toBeNull();
    expect(parseOutdatedBody('{}')).toBeNull();
    expect(parseOutdatedBody('{"minClientVersion":3}')).toBeNull();
    expect(parseOutdatedBody('')).toBeNull();
  });
});

describe('подписка на устаревшую версию', () => {
  it('слушатели получают ошибку с минимальной версией', () => {
    const seen = vi.fn();
    const off = onClientOutdated(seen);

    notifyClientOutdated(new ClientOutdatedError('1.2.0'));

    expect(seen).toHaveBeenCalledOnce();
    expect(seen.mock.calls[0][0].minClientVersion).toBe('1.2.0');
    off();
  });

  it('после отписки уведомления не приходят', () => {
    const seen = vi.fn();
    const off = onClientOutdated(seen);
    off();

    notifyClientOutdated(new ClientOutdatedError(null));

    expect(seen).not.toHaveBeenCalled();
  });

  it('ошибка говорит человеку, что делать', () => {
    expect(new ClientOutdatedError(null).message).toContain('обновите');
  });
});
