// Базовые элементы интерфейса поверх темы. Экраны собираются из них, а не
// объявляют свои цвета и отступы — иначе тёмная тема и ритм расходятся.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  type RefreshControlProps,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { font, radius, space, useTheme } from './theme';

/** Экран: фон темы + безопасные зоны. `scroll` — для длинного содержимого. */
export function Screen({
  children,
  scroll = true,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const { colors } = useTheme();
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex]}>{children}</View>
  );
  return <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]}>{body}</SafeAreaView>;
}

export function Card({
  children,
  onPress,
  tone = 'plain',
}: {
  children: ReactNode;
  onPress?: () => void;
  /** `accent` — карточка текущего действия; `core` — фундаментальный узел графа. */
  tone?: 'plain' | 'accent' | 'core';
}) {
  const { colors } = useTheme();
  const border = tone === 'accent' ? colors.accent : tone === 'core' ? colors.core : colors.line;
  const style: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: border,
    borderWidth: tone === 'plain' ? StyleSheet.hairlineWidth : 1.5,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  };
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable style={({ pressed }) => [style, pressed && styles.pressed]} onPress={onPress}>
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'quiet' ? colors.accent : colors.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.sm,
          paddingVertical: space.md + 2,
          paddingHorizontal: space.lg,
          alignItems: 'center',
          borderWidth: variant === 'quiet' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.line,
        },
        (disabled || busy) && styles.dim,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontSize: font.body, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}

// ---- типографика ----

function useText(size: number, weight: TextStyle['fontWeight'], color: ToneKey) {
  const { colors } = useTheme();
  return { fontSize: size, fontWeight: weight, color: colors[color], lineHeight: size * 1.4 };
}
/** Ключи палитры, доступные тексту. Раньше это был объект-пустышка ради
 *  `keyof typeof`; тип выражает то же самое и не создаёт значения. */
type ToneKey = 'ink' | 'muted' | 'accent' | 'ok' | 'warn' | 'danger' | 'core';

export const Display = ({ children }: { children: ReactNode }) => (
  <Text style={useText(font.display, '700', 'ink')}>{children}</Text>
);

export const Title = ({ children }: { children: ReactNode }) => (
  <Text style={useText(font.title, '700', 'ink')}>{children}</Text>
);

export const Lead = ({ children }: { children: ReactNode }) => (
  <Text style={useText(font.lead, '500', 'ink')}>{children}</Text>
);

export const Body = ({ children }: { children: ReactNode }) => (
  <Text style={useText(font.body, '400', 'ink')}>{children}</Text>
);

export const Muted = ({ children }: { children: ReactNode }) => (
  <Text style={useText(font.small, '400', 'muted')}>{children}</Text>
);

export function Note({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'ok' | 'warn' | 'danger';
}) {
  return <Text style={useText(font.small, '500', tone)}>{children}</Text>;
}

/** Надпись-метка: короткая, разряженная, всегда приглушённая. */
export function Label({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: font.caption,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: colors.muted,
        fontWeight: '600',
      }}
    >
      {children}
    </Text>
  );
}

/** Поле ввода. Экраны не объявляют рамку и цвета сами: инлайн-копии этих
 *  стилей уже разъезжались между экранами при правке темы. */
export function Field({ invalid, style, ...rest }: TextInputProps & { invalid?: boolean }) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      style={[
        {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: invalid ? colors.danger : colors.line,
          backgroundColor: colors.surface,
          color: colors.ink,
          borderRadius: radius.sm,
          padding: space.md,
          fontSize: font.body,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// ---- составные ----

export function Pill({
  text,
  tone = 'muted',
}: {
  text: string;
  tone?: 'muted' | 'accent' | 'core';
}) {
  const { colors } = useTheme();
  const fg = tone === 'accent' ? colors.accent : tone === 'core' ? colors.core : colors.muted;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Text style={{ fontSize: font.caption, color: fg, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'core' }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: tone === 'core' ? colors.core : colors.accent,
        }}
      />
    </View>
  );
}

/** Заголовок вложенного экрана с возвратом — единый на все стековые страницы. */
export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {onBack && (
        <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8}>
          <Text style={{ color: colors.accent, fontSize: font.body }}>← Назад</Text>
        </Pressable>
      )}
      <Title>{title}</Title>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
      <Muted>{text}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.5 },
});
