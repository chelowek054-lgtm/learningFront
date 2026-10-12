// Рендерер Activity `material_read` (WS7): чтение учебного материала.
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Palette } from '@/shared/ui';
import type { ActivityRendererProps } from '@/shared/engine';
import { useI18n } from '@/shared/i18n';

export function MaterialReadActivity({ activity }: ActivityRendererProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const payload = activity.payload as { title?: string; text?: string };
  return (
    <View style={styles.box}>
      {!!payload.title && <Text style={styles.title}>{payload.title}</Text>}
      <Text style={styles.text}>{payload.text ?? t('materialReadMaterialReadActivity.1')}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    box: { gap: 8 },
    title: { fontSize: 17, fontWeight: '700', color: c.ink },
    text: { fontSize: 15, lineHeight: 22, color: c.ink },
  });
