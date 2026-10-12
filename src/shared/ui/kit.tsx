// Базовые элементы интерфейса поверх темы. Экраны собираются из них, а не
// объявляют свои цвета и отступы — иначе тёмная тема и ритм расходятся.
import { useState, type ReactNode } from 'react';
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
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { elevationCard } from './elevation';
import { mixColors } from './color';
import { font, radius, space, useTheme } from './theme';
import { backdropStyle } from './backdrop';
import { SMALL, SMALL_HIT_SLOP, type ControlSize, type ControlTone } from './control-size';
import { typography } from '@/shared/config';

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
  const { colors, name } = useTheme();
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex]}>{children}</View>
  );
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.bg }, backdropStyle(name, colors)]}
    >
      {body}
    </SafeAreaView>
  );
}

export function Card({
  children,
  onPress,
  tone = 'plain',
}: {
  children: ReactNode;
  onPress?: () => void;
  /** `accent` — главный блок экрана (текущее действие); `core` — фундаментальный узел графа. */
  tone?: 'plain' | 'accent' | 'core';
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // Блоки отделяются фоном и мягкой тенью; рамка — только у акцентного блока экрана (D-0001).
  const border = focused
    ? colors.focus
    : tone === 'accent'
      ? mixColors(colors.accent, colors.line, 0.45)
      : tone === 'core'
        ? colors.core
        : colors.line;
  const style: ViewStyle = {
    backgroundColor:
      tone === 'accent' ? mixColors(colors.accent, colors.surface, 0.12) : colors.surface,
    borderColor: border,
    borderWidth: focused ? 2 : tone === 'plain' ? StyleSheet.hairlineWidth : 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    ...elevationCard(colors.shadow),
  };
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      style={({ pressed }) => [style, pressed && styles.pressed]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
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
  size = 'md',
  tone,
  leading,
  trailing,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  /** «sm» — малая кнопка для плотных блоков (D-0003); не для основных действий экрана. */
  size?: ControlSize;
  /** Роль цвета малой кнопки; без неё нейтральная. */
  tone?: ControlTone;
  /** Знак перед подписью малой кнопки (точка роли). */
  leading?: ReactNode;
  /** Знак после подписи малой кнопки («›»). */
  trailing?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  if (size === 'sm') {
    const role = tone === 'info' ? colors.info : tone === 'ok' ? colors.ok : colors.muted;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        disabled={disabled || busy}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        hitSlop={SMALL_HIT_SLOP}
        style={({ pressed }) => [
          {
            minHeight: SMALL.height,
            maxWidth: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingLeft: SMALL.paddingLeft,
            paddingRight: SMALL.paddingRight,
            borderRadius: radius.pill,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? colors.focus : mixColors(role, colors.line, 0.45),
            backgroundColor: mixColors(role, colors.surface, 0.09),
          },
          (disabled || busy) && styles.dim,
          pressed && styles.pressed,
        ]}
      >
        {leading}
        <Text
          style={{ flexShrink: 1, color: colors.ink, fontSize: SMALL.fontSize, fontWeight: '600' }}
        >
          {label}
        </Text>
        {trailing ? <Text style={{ color: colors.muted, fontSize: 14 }}>{trailing}</Text> : null}
      </Pressable>
    );
  }
  const bg =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : 'transparent';
  const fg =
    variant === 'quiet'
      ? colors.accentText
      : variant === 'danger'
        ? colors.onDanger
        : colors.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          minHeight: 48,
          justifyContent: 'center',
          paddingHorizontal: space.lg,
          alignItems: 'center',
          borderWidth: focused ? 2 : variant === 'quiet' ? 1 : 0,
          borderColor: focused ? colors.focus : colors.line,
        },
        variant === 'primary' && elevationCard(colors.accent, 0.3),
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

function useText(role: keyof typeof typography, color: ToneKey) {
  const { colors } = useTheme();
  const t = typography[role];
  return {
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    color: colors[color],
    lineHeight: t.lineHeight,
  };
}
/** Ключи палитры, доступные тексту. Раньше это был объект-пустышка ради
 *  `keyof typeof`; тип выражает то же самое и не создаёт значения. */
type ToneKey = 'ink' | 'muted' | 'accentText' | 'ok' | 'warn' | 'danger' | 'core';

export const Display = ({ children }: { children: ReactNode }) => (
  <Text style={useText('display', 'ink')}>{children}</Text>
);

export const Title = ({ children }: { children: ReactNode }) => (
  <Text style={useText('title', 'ink')}>{children}</Text>
);

export const Lead = ({ children }: { children: ReactNode }) => (
  <Text style={useText('lead', 'ink')}>{children}</Text>
);

export const Body = ({ children }: { children: ReactNode }) => (
  <Text style={useText('body', 'ink')}>{children}</Text>
);

export const Muted = ({ children }: { children: ReactNode }) => (
  <Text style={useText('small', 'muted')}>{children}</Text>
);

export function Note({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'ok' | 'warn' | 'danger';
}) {
  return <Text style={useText('small', tone)}>{children}</Text>;
}

/** Надпись-метка: короткая, разряженная, всегда приглушённая. */
export function Label({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: font.caption,
        letterSpacing: font.caption * 0.08,
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
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        {
          borderWidth: focused ? 2 : 1,
          borderColor: invalid ? colors.danger : focused ? colors.focus : colors.line,
          minHeight: 48,
          backgroundColor: colors.surface,
          color: colors.ink,
          borderRadius: radius.md,
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
  tone?: 'muted' | 'accent' | 'core' | 'info' | 'warn' | 'danger';
}) {
  const { colors } = useTheme();
  // Мягкая заливка — 12 % роли поверх поверхности, текст — роль (D-0001, tint.soft).
  const role =
    tone === 'accent'
      ? colors.accentText
      : tone === 'core'
        ? colors.core
        : tone === 'info'
          ? colors.info
          : tone === 'warn'
            ? colors.warn
            : tone === 'danger'
              ? colors.danger
              : colors.muted;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: space.sm + 2,
        paddingVertical: 3,
        backgroundColor:
          tone === 'muted' ? colors.surfaceAlt : mixColors(role, colors.surface, 0.12),
      }}
    >
      <Text style={{ fontSize: font.caption, color: role, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

/** Чип-фильтр: включён/выключён, зона нажатия не меньше 44 px, состояние видно не только цветом (галочка). */
export function Chip({
  text,
  selected,
  onPress,
  size = 'md',
}: {
  text: string;
  selected: boolean;
  onPress: () => void;
  /** «sm» — малый чип для плотных блоков (D-0003): 32 px видимых, зона нажатия 44 px. */
  size?: ControlSize;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const small = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={small ? SMALL_HIT_SLOP : undefined}
      style={{
        minHeight: small ? SMALL.height : 44,
        justifyContent: 'center',
        paddingHorizontal: small ? SMALL.paddingLeft : space.md + 2,
        borderRadius: radius.pill,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? colors.focus : selected ? colors.accent : colors.line,
        backgroundColor: selected ? mixColors(colors.accent, colors.surface, 0.12) : colors.surface,
      }}
    >
      <Text
        style={{
          fontSize: small ? SMALL.fontSize : font.small,
          fontWeight: selected ? '600' : '400',
          color: selected ? colors.accentText : colors.ink,
        }}
      >
        {selected ? '✓ ' : ''}
        {text}
      </Text>
    </Pressable>
  );
}

/** Переключатель режима («Список / Дерево / Карта»): один выбран, остальные ведут к нему. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        gap: 3,
        padding: 3,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md - 3,
              backgroundColor: active
                ? mixColors(colors.accent, colors.surface, 0.16)
                : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: font.small + 1,
                fontWeight: '600',
                color: active ? colors.accentText : colors.muted,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'core' }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height: 8,
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
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.accentText, fontSize: font.body }}>← Назад</Text>
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
