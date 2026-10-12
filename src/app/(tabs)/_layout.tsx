// Вкладки: значок + подпись, раскладка по ширине окна (макет Claude Design):
// телефон — вкладки внизу, планшет — рейка слева, десктоп — боковая панель.
//
// Прежде панель была только текстовой — иконочной библиотеки в проекте нет, а
// эмодзи в этой роли читаются как недоделка. Тянуть зависимость ради четырёх
// значков не стоит, поэтому глифы собраны из View: те же токены темы, никакого
// нового пакета. Подписи оставлены — в обучающем приложении они уместны.
import { useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/entities/session';
import {
  font,
  isNavActive,
  NAV_WIDTH,
  navItemsFor,
  navLayoutFor,
  radius,
  space,
  useTheme,
  withAlpha,
  type NavLayout,
} from '@/shared/ui';

type Glyph = 'today' | 'course' | 'graph' | 'profile' | 'curator';

const GLYPH: Record<string, Glyph> = {
  index: 'today',
  path: 'course',
  progress: 'graph',
  profile: 'profile',
  curator: 'curator',
};
const TAB_NAMES = ['index', 'path', 'progress', 'profile'] as const;

const SIZE = 18;

/** Глифы из примитивов: точка-узел, ступени пути, развилка графа, силуэт, щит куратора. */
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
  if (glyph === 'curator') {
    return (
      <View style={[styles.glyph, { alignItems: 'center', justifyContent: 'center' }]}>
        <View
          style={{
            width: SIZE - 4,
            height: SIZE - 2,
            borderWidth: 2,
            borderColor: color,
            borderBottomLeftRadius: SIZE / 2,
            borderBottomRightRadius: SIZE / 2,
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
          }}
        />
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

interface NavEntry {
  key: string;
  label: string;
  path: string;
}

function NavButton({
  item,
  layout,
  active,
  onPress,
}: {
  item: NavEntry;
  layout: NavLayout;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const tint = active ? colors.accentText : colors.muted;
  const row = layout === 'side';
  return (
    <Pressable
      accessibilityRole={layout === 'bottom' ? 'tab' : 'link'}
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.item,
        layout === 'bottom' && styles.itemBottom,
        layout === 'rail' && styles.itemRail,
        row && styles.itemSide,
        active && layout !== 'bottom' && { backgroundColor: withAlpha(colors.accent, 0.14) },
        focused && { borderWidth: 2, borderColor: colors.focus },
      ]}
    >
      <TabGlyph glyph={GLYPH[item.key] ?? 'today'} color={tint} />
      <Text
        style={{
          fontSize: row ? font.small : font.caption,
          fontWeight: active ? '700' : '600',
          color: active ? colors.accentText : colors.muted,
        }}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function TabBar() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isAdmin } = useSession();
  const layout = navLayoutFor(width);
  const items = navItemsFor(layout, isAdmin);
  const main = items.filter((i) => i.key !== 'curator');
  const service = items.filter((i) => i.key === 'curator');

  // «Куратор» лежит вне вкладок: открывается поверх, как и прочие служебные экраны.
  const go = (path: string) =>
    path === '/curator' ? router.push(path) : router.navigate(path as '/');
  const button = (i: NavEntry) => (
    <NavButton
      key={i.key}
      item={i}
      layout={layout}
      active={isNavActive(i.path, pathname)}
      onPress={() => go(i.path)}
    />
  );

  if (layout === 'bottom') {
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
        {main.map(button)}
      </View>
    );
  }
  return (
    <View
      style={[
        styles.side,
        {
          width: NAV_WIDTH[layout],
          backgroundColor: colors.surface,
          borderRightColor: colors.line,
          paddingTop: Math.max(insets.top, space.lg),
          alignItems: layout === 'rail' ? 'center' : 'stretch',
        },
      ]}
    >
      {layout === 'side' && (
        <Text style={[styles.brand, { color: colors.ink }]} accessibilityRole="header">
          Praxis
        </Text>
      )}
      {main.map(button)}
      <View style={{ flex: 1 }} />
      {service.length > 0 && (
        <View style={[styles.service, { borderTopColor: colors.line }]}>{service.map(button)}</View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const layout = navLayoutFor(width);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: layout === 'bottom' ? 'bottom' : 'left',
      }}
      tabBar={() => <TabBar />}
    >
      {TAB_NAMES.map((name) => (
        <Tabs.Screen key={name} name={name} />
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
  item: { alignItems: 'center', justifyContent: 'center', gap: space.xs, borderRadius: radius.md },
  itemBottom: { flex: 1, minHeight: 48 },
  itemRail: { width: 80, minHeight: 60, marginBottom: space.xs },
  itemSide: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: space.md,
    minHeight: 44,
    paddingHorizontal: space.md,
    marginBottom: space.xs,
  },
  side: {
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
  },
  brand: {
    fontSize: font.lead,
    fontWeight: '700',
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
  },
  service: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, alignItems: 'center' },
  glyph: { width: SIZE, height: SIZE },
  graphTop: { flexDirection: 'row', justifyContent: 'space-between' },
});
