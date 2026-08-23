// Корневой layout: провайдеры (сессия + реестр модулей) + Stack.
// Навигацию внутри приложения ведёт index.tsx (Home/Review/Activity), табы не нужны.
import { Stack } from 'expo-router';
import { useMemo } from 'react';

import { SessionProvider } from '@/entities/session';
import { ModuleRegistryProvider } from '@/shared/lib';
import { getModuleRegistry } from '@/widgets/module-registry';

export default function RootLayout() {
  const registry = useMemo(() => getModuleRegistry(), []);
  return (
    <SessionProvider>
      <ModuleRegistryProvider registry={registry}>
        <Stack screenOptions={{ headerShown: false }} />
      </ModuleRegistryProvider>
    </SessionProvider>
  );
}
