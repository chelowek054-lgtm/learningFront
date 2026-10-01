// Авто-синхронизация (T-0046): sync сам запускается, когда появляется сеть или
// приложение возвращается из фона. Ядро — чистый контроллер без React и без
// нативных модулей, чтобы его можно было проверить тестом; подписки на
// expo-network и AppState навешивает `startAutoSync`.
import { AppState, type AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import type { LocalStore } from '@/shared/engine';
import { syncNow } from './sync-service';

export interface AutoSyncController {
  /** Состояние сети изменилось; sync стартует только на переходе offline → online. */
  onNetwork(connected: boolean): void;
  /** Состояние приложения изменилось; sync стартует при возврате из фона. */
  onAppState(state: AppStateStatus): void;
  /** Запуск «по требованию» (старт приложения). */
  trigger(): Promise<void>;
}

/**
 * `run` не вызывается параллельно: пока sync идёт, новые триггеры схлопываются
 * в один повторный запуск после него. Ошибки не всплывают — без сети sync и
 * должен молча не получиться, повторится на следующем триггере.
 */
export function createAutoSync(run: () => Promise<void>): AutoSyncController {
  let running: Promise<void> | null = null;
  let again = false;
  let online: boolean | null = null;
  let appState: AppStateStatus = 'active';

  function trigger(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          try {
            await run();
          } catch {
            // офлайн или сервер недоступен: повторим на следующем триггере
          }
        } while (again);
      } finally {
        running = null;
      }
    })();
    return running;
  }

  return {
    trigger,
    onNetwork(connected) {
      const wasOffline = online === false;
      online = connected;
      if (connected && wasOffline) void trigger();
    },
    onAppState(state) {
      const fromBackground = appState === 'background' || appState === 'inactive';
      appState = state;
      if (state === 'active' && fromBackground) void trigger();
    },
  };
}

/** Подписки на сеть и жизненный цикл приложения; возвращает функцию отписки. */
export function startAutoSync(store: LocalStore): () => void {
  const auto = createAutoSync(() => syncNow(store));
  const net = Network.addNetworkStateListener((s) => auto.onNetwork(s.isConnected ?? false));
  const app = AppState.addEventListener('change', auto.onAppState);
  // Начальное состояние сети нужно, чтобы первый «offline → online» не потерялся.
  void Network.getNetworkStateAsync().then((s) => auto.onNetwork(s.isConnected ?? false));
  void auto.trigger();
  return () => {
    net.remove();
    app.remove();
  };
}
