// Корневой layout: провайдеры, вход в приложение и стек экранов.
// Гейт стоит здесь, а не внутри роутов: пока сессии нет, показывать нечего,
// и незачем плодить редиректы между вкладками.
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { SessionProvider, useSession } from '@/entities/session';
import { AuthScreen } from '@/pages/auth';
import { OnboardingScreen } from '@/pages/onboarding';
import {
  getLocalStore,
  installErrorReporter,
  onClientOutdated,
  startAutoSync,
  targetForNotification,
} from '@/shared/api';
import { ModuleRegistryProvider } from '@/shared/lib';
import { Lead, Muted, Screen, ThemeProvider, Title, useTheme } from '@/shared/ui';
import { AppShell } from '@/widgets/app-nav';
import { getModuleRegistry } from '@/widgets/module-registry';
import { I18nProvider } from '@/shared/i18n';

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
  // Необработанные ошибки уходят на сервер (T-0050); отчёты принимаются только от вошедшего.
  useEffect(() => installErrorReporter(), []);
  return null;
}

/** Нажатие на уведомление открывает экран, о котором оно (T-0111). Только на устройстве: в вебе слушателя нет. */
function useNotificationRoute() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      router.navigate(targetForNotification(r.notification.request.content.data));
    });
    return () => sub.remove();
  }, [router]);
}

function Gate() {
  useNotificationRoute();
  const { status, user } = useSession();
  const { colors, dark } = useTheme();

  if (status === 'loading') return null; // splash держится
  if (status === 'anonymous') return <AuthScreen />;
  if (!user?.profile?.onboarded) return <OnboardingScreen />;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <AutoSync />
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="review" options={{ presentation: 'card' }} />
          <Stack.Screen name="materials" options={{ presentation: 'card' }} />
          <Stack.Screen name="placement" options={{ presentation: 'card' }} />
          <Stack.Screen name="activities" options={{ presentation: 'card' }} />
        </Stack>
      </AppShell>
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
    <I18nProvider>
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
    </I18nProvider>
  );
}
