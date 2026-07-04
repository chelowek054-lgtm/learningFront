// Заглушка рендерера Activity. Один плейсхолдер на все типы до появления
// настоящих feature-слайсов (Фаза 1). Показывает тип из props.activity.
import { StyleSheet, Text, View } from 'react-native';
import type { ActivityRendererProps } from '@/shared/engine';

export function NotImplementedActivity({ activity }: ActivityRendererProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{activity.type}</Text>
      <Text style={styles.subtitle}>рендерер ещё не реализован</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, opacity: 0.6 },
});
