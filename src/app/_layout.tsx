// Корневой layout: провайдеры, вход в приложение и стек экранов.
// Гейт стоит здесь, а не внутри роутов: пока сессии нет, показывать нечего,
// и незачем плодить редиректы между вкладками.
import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/entities/session';
import { AuthScreen } from '@/pages/auth';
import { OnboardingScreen } from '@/pages/onboarding';
import { ModuleRegistryProvider } from '@/shared/lib';
import { ThemeProvider, useTheme } from '@/shared/ui';
import { getModuleRegistry } from '@/widgets/module-registry';

function Gate() {
  const { status, user } = useSession();
  const { colors, dark } = useTheme();

  if (status === 'loading') return null; // splash держится
  if (status === 'anonymous') return <AuthScreen />;
  if (!user?.profile?.onboarded) return <OnboardingScreen />;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
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
          <Gate />
        </ModuleRegistryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
