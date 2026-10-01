import { describe, expect, it, vi } from 'vitest';
import { createAutoSync } from './auto-sync';

// Нативные модули не нужны ядру контроллера: подменяем, чтобы файл загрузился в Node.
vi.mock('react-native', () => ({ AppState: { addEventListener: vi.fn() } }));
vi.mock('expo-network', () => ({
  addNetworkStateListener: vi.fn(),
  getNetworkStateAsync: vi.fn(),
}));
vi.mock('./sync-service', () => ({ syncNow: vi.fn() }));

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createAutoSync', () => {
  it('запускает sync на переходе offline → online', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const auto = createAutoSync(run);

    auto.onNetwork(false);
    auto.onNetwork(true);
    await flush();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('не запускает sync, пока сеть была и остаётся доступной', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const auto = createAutoSync(run);

    auto.onNetwork(true); // первое наблюдение — не переход
    auto.onNetwork(true);
    await flush();

    expect(run).not.toHaveBeenCalled();
  });

  it('запускает sync при возврате из фона, но не при первом active', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const auto = createAutoSync(run);

    auto.onAppState('active');
    await flush();
    expect(run).not.toHaveBeenCalled();

    auto.onAppState('background');
    auto.onAppState('active');
    await flush();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('возврат из inactive (шторка, звонок) тоже считается возвратом', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const auto = createAutoSync(run);

    auto.onAppState('inactive');
    auto.onAppState('active');
    await flush();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('не запускает sync параллельно: триггеры во время работы схлопываются в один повтор', async () => {
    let release!: () => void;
    let active = 0;
    let maxActive = 0;
    const run = vi.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((r) => (release = r));
      active -= 1;
    });
    const auto = createAutoSync(run);

    const first = auto.trigger();
    void auto.trigger();
    void auto.trigger();
    await flush();
    expect(run).toHaveBeenCalledTimes(1);

    release();
    await flush();
    release(); // повторный запуск после первого
    await first;

    expect(run).toHaveBeenCalledTimes(2);
    expect(maxActive).toBe(1);
  });

  it('ошибка sync не всплывает и не блокирует следующий запуск', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('нет сети')).mockResolvedValue(undefined);
    const auto = createAutoSync(run);

    await expect(auto.trigger()).resolves.toBeUndefined();
    await auto.trigger();

    expect(run).toHaveBeenCalledTimes(2);
  });
});
