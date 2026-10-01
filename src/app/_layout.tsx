// Корневой layout: провайдеры, вход в приложение и стек экранов.
// Гейт стоит здесь, а не внутри роутов: пока сессии нет, показывать нечего,
// и незачем плодить редиректы между вкладками.
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/entities/session';
import { AuthScreen } from '@/pages/auth';
import { OnboardingScreen } from '@/pages/onboarding';
import { getLocalStore, startAutoSync } from '@/shared/api';
import { ModuleRegistryProvider } from '@/shared/lib';
import { ThemeProvider, useTheme } from '@/shared/ui';
import { getModuleRegistry } from '@/widgets/module-registry';

/**
 * Заголовок вкладки браузера. Через options.title экранов он не проставлялся —
 * expo-router оставлял <title> пустым, и страница выглядела безымянной. Head —
 * поддерживаемый способ управлять головой документа; на нативе это no-op.
 */
function DocumentHead() {
  return (
    <Head>
      <title>Praxis</title>
    </Head>
  );
}

/**
 * Фоновая синхронизация (T-0046): со входа и до выхода следит за сетью и
 * возвратом из фона. Монтируется только при открытой сессии — до неё sync
 * ходил бы на сервер без токена.
 */
function AutoSync() {
  useEffect(() => startAutoSync(getLocalStore()), []);
  return null;
}

function Gate() {
  const { status, user } = useSession();
  const { colors, dark } = useTheme();

  if (status === 'loading') return null; // splash держится
  if (status === 'anonymous') return <AuthScreen />;
  if (!user?.profile?.onboarded) return <OnboardingScreen />;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <AutoSync />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="review" options={{ presentation: 'card' }} />
        <Stack.Screen name="placement" options={{ presentation: 'card' }} />
        <Stack.Screen name="activities" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const registry = useMemo(() => getModuleRegistry(), []);
  return (
    <ThemeProvider>
      <SessionProvider>
        <ModuleRegistryProvider registry={registry}>
          <DocumentHead />
          <Gate />
        </ModuleRegistryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
