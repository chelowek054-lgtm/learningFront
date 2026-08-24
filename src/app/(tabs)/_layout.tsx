// Вкладки. Иконочной библиотеки в проекте нет, поэтому панель типографическая:
// подпись + полоска активной вкладки. Это выбор, а не заглушка — эмодзи в роли
// иконок читаются как недоделка, а текст в обучающем приложении уместен.
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, space, useTheme } from '@/shared/ui';

const TABS = [
  { name: 'index', path: '/', label: 'Сегодня' },
  { name: 'course', path: '/course', label: 'Курс' },
  { name: 'graph', path: '/graph', label: 'Граф' },
  { name: 'profile', path: '/profile', label: 'Профиль' },
] as const;

function TabBar() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, space.sm),
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(tab.path)}
          >
            <View
              style={[
                styles.mark,
                { backgroundColor: active ? colors.accent : 'transparent' },
              ]}
            />
            <Text
              style={{
                fontSize: font.caption,
                fontWeight: active ? '700' : '500',
                color: active ? colors.ink : colors.muted,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => <TabBar />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: space.sm },
  mark: { height: 3, width: 28, borderRadius: 999 },
});
