// Заглушка рендерера Activity: тип есть в реестре, а рендерера ещё нет.
import { StyleSheet, View } from 'react-native';
import type { ActivityRendererProps } from '@/shared/engine';
import { Body, Muted } from './kit';
import { radius, space, useTheme } from './theme';

export function NotImplementedActivity({ activity }: ActivityRendererProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: space.lg,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        gap: space.xs,
      }}
    >
      <Body>{activity.type}</Body>
      <Muted>рендерер ещё не реализован</Muted>
    </View>
  );
}
