// Отчёты об ошибках клиента (T-0050): необработанная ошибка на устройстве уходит на
// сервер, где о ней видно администратору. Ядро — чистый «репортёр»: он дедуплицирует,
// ограничивает число отчётов за сессию и сам никогда не бросает ошибок, иначе сбой в
// отправке отчёта породил бы новый отчёт и цикл.
import { api } from './http';
import { APP_VERSION } from './app-version';

export interface ErrorReport {
  message: string;
  stack?: string;
  appVersion: string;
  fatal: boolean;
  context: Record<string, unknown>;
}

const MAX_MESSAGE = 500;
const MAX_STACK = 8000;

/** Ошибкой в JS бросают что угодно: строку, объект, undefined — отчёт должен собраться из любого. */
export function buildReport(
  error: unknown,
  fatal: boolean,
  context: Record<string, unknown> = {},
  appVersion: string = APP_VERSION,
): ErrorReport {
  const isError = error instanceof Error;
  const message = isError
    ? error.message
    : typeof error === 'string'
      ? error
      : error === undefined || error === null
        ? ''
        : safeJson(error);
  return {
    message: (message || 'Неизвестная ошибка').slice(0, MAX_MESSAGE),
    stack: isError && error.stack ? error.stack.slice(0, MAX_STACK) : undefined,
    appVersion,
    fatal,
    context,
  };
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

export interface Reporter {
  report(error: unknown, fatal?: boolean, context?: Record<string, unknown>): void;
}

export function createReporter(opts: {
  send: (r: ErrorReport) => Promise<unknown>;
  now?: () => number;
  /** Одинаковая ошибка чаще раза в это время не отправляется. */
  dedupeMs?: number;
  /** Потолок отчётов за запуск приложения. */
  maxPerSession?: number;
}): Reporter {
  const now = opts.now ?? Date.now;
  const dedupeMs = opts.dedupeMs ?? 60_000;
  const maxPerSession = opts.maxPerSession ?? 20;
  const lastSent = new Map<string, number>();
  let sent = 0;
  let sending = false;

  return {
    report(error, fatal = false, context = {}) {
      try {
        // Сама отправка не должна порождать отчётов: ошибка внутри неё молча гасится.
        if (sending || sent >= maxPerSession) return;
        const report = buildReport(error, fatal, context);
        const key = report.message;
        const last = lastSent.get(key);
        if (last !== undefined && now() - last < dedupeMs) return;
        lastSent.set(key, now());
        sent += 1;
        sending = true;
        void opts
          .send(report)
          .catch(() => undefined)
          .finally(() => {
            sending = false;
          });
      } catch {
        sending = false;
      }
    },
  };
}

interface GlobalErrorUtils {
  getGlobalHandler?: () => (e: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (h: (e: unknown, isFatal?: boolean) => void) => void;
}

/**
 * Подключает отчёты к глобальным обработчикам: ErrorUtils в React Native, события окна на web.
 * Прежний обработчик вызывается дальше — красный экран и краш-логи системы не теряются.
 * Возвращает отписку.
 */
export function installErrorReporter(): () => void {
  const reporter = createReporter({
    send: (r) => api('/client-errors', { method: 'POST', body: JSON.stringify(r) }),
  });
  const cleanups: (() => void)[] = [];

  const utils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (utils?.setGlobalHandler && utils.getGlobalHandler) {
    const previous = utils.getGlobalHandler();
    utils.setGlobalHandler((e, isFatal) => {
      reporter.report(e, !!isFatal);
      previous(e, isFatal);
    });
    cleanups.push(() => utils.setGlobalHandler?.(previous));
  }

  const w = globalThis as {
    addEventListener?: (t: string, h: (ev: unknown) => void) => void;
    removeEventListener?: (t: string, h: (ev: unknown) => void) => void;
  };
  if (w.addEventListener && w.removeEventListener && typeof window !== 'undefined') {
    const onError = (ev: unknown) => reporter.report((ev as { error?: unknown }).error ?? ev, true);
    const onRejection = (ev: unknown) =>
      reporter.report((ev as { reason?: unknown }).reason ?? ev, false);
    w.addEventListener('error', onError);
    w.addEventListener('unhandledrejection', onRejection);
    cleanups.push(() => {
      w.removeEventListener?.('error', onError);
      w.removeEventListener?.('unhandledrejection', onRejection);
    });
  }
  return () => cleanups.forEach((c) => c());
}
