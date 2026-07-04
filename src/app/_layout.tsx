import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { getModuleRegistry } from '@/entities/module';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ModuleRegistryProvider } from '@/shared/lib';

SplashScreen.preventAutoHideAsync();

// Composition root приложения: реестр модулей создаётся здесь (app-слой)
// и прокидывается вниз через контекст.
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const registry = useMemo(() => getModuleRegistry(), []);
  return (
    <ModuleRegistryProvider registry={registry}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </ModuleRegistryProvider>
  );
}
