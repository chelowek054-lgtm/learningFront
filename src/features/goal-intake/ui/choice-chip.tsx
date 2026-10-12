// Вариант выбора из списка (уровень цели): высота не меньше 44 px, состояние не только цветом.
import { Pressable, Text } from 'react-native';
import { font, radius, space, useTheme } from '@/shared/ui';

export function ChoiceRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingHorizontal: space.md,
        borderRadius: radius.md,
        borderWidth: active ? 2 : 1,
        borderColor: active ? colors.accent : colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={{ fontSize: font.body, color: active ? colors.accentText : colors.muted }}>
        {active ? '●' : '○'}
      </Text>
      <Text
        style={{
          flex: 1,
          fontSize: font.body,
          fontWeight: active ? '600' : '400',
          color: colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
