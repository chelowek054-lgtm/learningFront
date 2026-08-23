// Рендерер Activity `material_read` (WS7): чтение учебного материала.
import { StyleSheet, Text, View } from 'react-native';
import type { ActivityRendererProps } from '@/shared/engine';

export function MaterialReadActivity({ activity }: ActivityRendererProps) {
  const payload = activity.payload as { title?: string; text?: string };
  return (
    <View style={styles.box}>
      {!!payload.title && <Text style={styles.title}>{payload.title}</Text>}
      <Text style={styles.text}>{payload.text ?? 'Материал пуст.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  text: { fontSize: 15, lineHeight: 22 },
});
