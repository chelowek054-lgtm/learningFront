// Экран графа знаний (KG2): хостит редактор. Это вкладка — возврат не нужен.
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraphExplorer } from '@/features/graph-editor';
import { space, Title, useTheme } from '@/shared/ui';

export function GraphScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Title>Граф знаний · ML</Title>
      </View>
      <GraphExplorer domain="ml" />
    </SafeAreaView>
  );
}
