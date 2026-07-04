// Детекция сети (WS2) — offline-first триггер синхронизации.
import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export async function getIsOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected ?? false;
}

/** Реактивный статус сети. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    void getIsOnline().then(setOnline);
    const sub = Network.addNetworkStateListener((state) => setOnline(state.isConnected ?? false));
    return () => sub.remove();
  }, []);
  return online;
}
