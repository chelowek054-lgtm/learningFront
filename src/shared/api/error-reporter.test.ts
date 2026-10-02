import { describe, expect, it, vi } from 'vitest';
import { buildReport, createReporter } from './error-reporter';

// http тянет нативное хранилище токена; для чистого репортёра оно не нужно.
vi.mock('./http', () => ({ api: vi.fn() }));
vi.mock('./app-version', () => ({ APP_VERSION: '1.0.0' }));

describe('buildReport', () => {
  it('берёт сообщение и стек из Error', () => {
    const r = buildReport(new Error('boom'), true, { screen: 'course' });
    expect(r).toMatchObject({ message: 'boom', fatal: true, appVersion: '1.0.0' });
    expect(r.stack).toContain('boom');
    expect(r.context).toEqual({ screen: 'course' });
  });

  it('собирается из чего угодно, что бросили вместо Error', () => {
    expect(buildReport('text', false).message).toBe('text');
    expect(buildReport({ code: 7 }, false).message).toBe('{"code":7}');
    expect(buildReport(undefined, false).message).toBe('Неизвестная ошибка');
    expect(buildReport(null, false).stack).toBeUndefined();
  });

  it('круговая ссылка в объекте не ломает сборку', () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(buildReport(a, false).message).toBe('[object Object]');
  });

  it('режет длинные сообщение и стек', () => {
    const e = new Error('m'.repeat(2000));
    e.stack = 's'.repeat(20000);
    const r = buildReport(e, false);
    expect(r.message.length).toBe(500);
    expect(r.stack!.length).toBe(8000);
  });
});

describe('createReporter', () => {
  const settle = () => new Promise((r) => setTimeout(r, 0));

  it('отправляет отчёт', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    createReporter({ send }).report(new Error('x'));
    await settle();
    expect(send).toHaveBeenCalledOnce();
  });

  it('одинаковая ошибка внутри окна не повторяется, после окна — снова', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    let t = 0;
    const r = createReporter({ send, now: () => t, dedupeMs: 1000 });

    r.report(new Error('same'));
    await settle();
    t = 500;
    r.report(new Error('same'));
    await settle();
    t = 1500;
    r.report(new Error('same'));
    await settle();

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('разные ошибки отправляются все', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const r = createReporter({ send });
    r.report(new Error('a'));
    await settle();
    r.report(new Error('b'));
    await settle();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('за сессию не больше потолка: цикл ошибок не заваливает сервер', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const r = createReporter({ send, maxPerSession: 3 });
    for (let i = 0; i < 10; i++) {
      r.report(new Error(`e${i}`));
      await settle();
    }
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('сбой отправки молча гасится и не порождает отчётов', async () => {
    const send = vi.fn().mockRejectedValue(new Error('сети нет'));
    const r = createReporter({ send });
    r.report(new Error('x'));
    await settle();
    expect(send).toHaveBeenCalledOnce();
  });

  it('пока идёт отправка, новые ошибки не отправляются: ошибка в самой отправке не зацикливает', () => {
    const send = vi.fn(() => new Promise(() => undefined)); // зависшая отправка
    const r = createReporter({ send });
    r.report(new Error('first'));
    r.report(new Error('second'));
    expect(send).toHaveBeenCalledOnce();
  });

  it('синхронное исключение из send не вылетает наружу', () => {
    const send = vi.fn(() => {
      throw new Error('sync');
    });
    expect(() => createReporter({ send }).report(new Error('x'))).not.toThrow();
  });
});
