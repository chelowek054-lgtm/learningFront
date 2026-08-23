// Экран графа знаний (KG2): хостит редактор.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraphExplorer } from '@/features/graph-editor';

export function GraphScreen({ onBack }: { onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack}>
            <Text style={styles.back}>← Назад</Text>
          </Pressable>
        )}
        <Text style={styles.h1}>Граф знаний · ML</Text>
      </View>
      <GraphExplorer domain="ml" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  back: { color: '#2563eb', fontSize: 15 },
  h1: { fontSize: 24, fontWeight: '700' },
});
