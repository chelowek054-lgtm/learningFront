// Устаревшая версия приложения (T-0033): сервер отвечает 426, и вместо непонятной
// ошибки человек видит просьбу обновиться. Слушатели нужны потому, что запрос идёт
// из любого экрана, а сообщение — одно на всё приложение.

export class ClientOutdatedError extends Error {
  constructor(public minClientVersion: string | null) {
    super('Версия приложения устарела: обновите его, чтобы продолжить.');
    this.name = 'ClientOutdatedError';
  }
}

/** Минимальная версия из тела ответа 426; тело не по форме — просто «неизвестно». */
export function parseOutdatedBody(text: string): string | null {
  try {
    const body = JSON.parse(text) as { minClientVersion?: unknown };
    return typeof body.minClientVersion === 'string' ? body.minClientVersion : null;
  } catch {
    return null;
  }
}

type Listener = (e: ClientOutdatedError) => void;
const listeners = new Set<Listener>();

/** Подписка на «приложение устарело»; возвращает отписку. */
export function onClientOutdated(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyClientOutdated(e: ClientOutdatedError): void {
  for (const l of listeners) l(e);
}
