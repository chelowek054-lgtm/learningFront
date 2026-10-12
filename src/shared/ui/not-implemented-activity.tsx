// Заглушка рендерера Activity: тип есть в реестре, а рендерера ещё нет.
import { StyleSheet, View } from 'react-native';
import { Body, Muted } from './kit';
import { radius, space, useTheme } from './theme';
import { useI18n } from '@/shared/i18n';

export function NotImplementedActivity({ activity }: { activity: { type: string } }) {
  const { t } = useI18n();
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
      <Muted>{t('m.notImplemented')}</Muted>
    </View>
  );
}
