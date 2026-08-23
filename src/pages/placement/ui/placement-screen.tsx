// Экран плейсмента — тонкая обёртка над фичей (FSD: страница не держит логику).
import { SafeAreaView, StyleSheet } from 'react-native';
import { PlacementSession } from '@/features/placement';

export function PlacementScreen({ domain = 'ml' }: { domain?: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <PlacementSession domain={domain} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
