// Вкладки: значок + подпись.
//
// Прежде панель была только текстовой — иконочной библиотеки в проекте нет, а
// эмодзи в этой роли читаются как недоделка. Тянуть зависимость ради четырёх
// значков не стоит, поэтому глифы собраны из View: те же токены темы, никакого
// нового пакета. Подписи оставлены — в обучающем приложении они уместны.
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, space, useTheme } from '@/shared/ui';

type Glyph = 'today' | 'course' | 'graph' | 'profile';

const TABS = [
  { name: 'index', path: '/', label: 'Сегодня', glyph: 'today' },
  { name: 'course', path: '/course', label: 'Курс', glyph: 'course' },
  { name: 'graph', path: '/graph', label: 'Граф', glyph: 'graph' },
  { name: 'profile', path: '/profile', label: 'Профиль', glyph: 'profile' },
] as const satisfies readonly { name: string; path: string; label: string; glyph: Glyph }[];

const SIZE = 18;

/** Глифы из примитивов: точка-узел, ступени пути, развилка графа, силуэт. */
function TabGlyph({ glyph, color }: { glyph: Glyph; color: string }) {
  const dot = (size: number) => ({
    width: size,
    height: size,
    borderRadius: radius.pill,
    backgroundColor: color,
  });
  const bar = (w: number) => ({ width: w, height: 3, borderRadius: 2, backgroundColor: color });

  if (glyph === 'today') {
    return (
      <View style={[styles.glyph, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={dot(SIZE - 4)} />
      </View>
    );
  }
  if (glyph === 'course') {
    return (
      <View style={[styles.glyph, { justifyContent: 'space-evenly', alignItems: 'flex-start' }]}>
        <View style={bar(SIZE)} />
        <View style={bar(SIZE * 0.7)} />
        <View style={bar(SIZE * 0.4)} />
      </View>
    );
  }
  if (glyph === 'graph') {
    return (
      <View style={styles.glyph}>
        <View style={styles.graphTop}>
          <View style={dot(6)} />
          <View style={dot(6)} />
        </View>
        <View style={[bar(2), { height: 6, alignSelf: 'center' }]} />
        <View style={[dot(7), { alignSelf: 'center' }]} />
      </View>
    );
  }
  return (
    <View style={[styles.glyph, { alignItems: 'center', justifyContent: 'flex-end' }]}>
      <View style={[dot(8), { marginBottom: 1 }]} />
      <View
        style={{
          width: SIZE - 2,
          height: 7,
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

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
        const tint = active ? colors.accent : colors.muted;
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(tab.path)}
          >
            <TabGlyph glyph={tab.glyph} color={tint} />
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
  tab: { flex: 1, alignItems: 'center', gap: space.xs },
  glyph: { width: SIZE, height: SIZE },
  graphTop: { flexDirection: 'row', justifyContent: 'space-between' },
});
