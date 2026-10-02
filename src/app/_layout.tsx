// Корневой layout: провайдеры, вход в приложение и стек экранов.
// Гейт стоит здесь, а не внутри роутов: пока сессии нет, показывать нечего,
// и незачем плодить редиректы между вкладками.
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/entities/session';
import { AuthScreen } from '@/pages/auth';
import { OnboardingScreen } from '@/pages/onboarding';
import { getLocalStore, onClientOutdated, startAutoSync } from '@/shared/api';
import { ModuleRegistryProvider } from '@/shared/lib';
import { Lead, Muted, Screen, ThemeProvider, Title, useTheme } from '@/shared/ui';
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
        <Stack.Screen name="progress" options={{ presentation: 'card' }} />
        <Stack.Screen name="materials" options={{ presentation: 'card' }} />
        <Stack.Screen name="placement" options={{ presentation: 'card' }} />
        <Stack.Screen name="activities" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

/**
 * Сервер отверг версию приложения (426): вместо непонятной ошибки на каждом экране
 * показываем одно понятное сообщение поверх всего (T-0033).
 */
function OutdatedGate({ children }: { children: React.ReactNode }) {
  const [minVersion, setMinVersion] = useState<string | null | undefined>(undefined);
  useEffect(() => onClientOutdated((e) => setMinVersion(e.minClientVersion)), []);
  if (minVersion === undefined) return <>{children}</>;
  return (
    <Screen>
      <Title>Нужно обновить приложение</Title>
      <Lead>Эта версия больше не поддерживается сервером.</Lead>
      <Muted>
        {minVersion ? `Установите версию ${minVersion} или новее из магазина приложений. ` : ''}
        Ваши данные сохранены на устройстве и никуда не пропадут.
      </Muted>
    </Screen>
  );
}

export default function RootLayout() {
  const registry = useMemo(() => getModuleRegistry(), []);
  return (
    <ThemeProvider>
      <SessionProvider>
        <ModuleRegistryProvider registry={registry}>
          <DocumentHead />
          <OutdatedGate>
            <Gate />
          </OutdatedGate>
        </ModuleRegistryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
