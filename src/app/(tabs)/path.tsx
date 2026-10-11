// Вкладка «Путь»: шаги курса и карта знаний — два взгляда на один путь (R-0059, T-0111).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CourseTree } from '@/features/graph-editor';
import { useSession } from '@/entities/session';
import { CourseScreen } from '@/pages/course';
import { GraphScreen } from '@/pages/graph';
import { Button, space, useTheme } from '@/shared/ui';
import { SubjectBar } from '@/widgets/subject-bar';

export default function PathTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'steps' | 'tree' | 'map'>('steps');
  const { subject } = useSession();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SubjectBar onOpenLibrary={() => router.push('/library')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.md }}>
        <Button
          label="Шаги"
          variant={mode === 'steps' ? 'primary' : 'quiet'}
          onPress={() => setMode('steps')}
        />
        <Button
          label="Дерево"
          variant={mode === 'tree' ? 'primary' : 'quiet'}
          onPress={() => setMode('tree')}
        />
        <Button
          label="Карта"
          variant={mode === 'map' ? 'primary' : 'quiet'}
          onPress={() => setMode('map')}
        />
        <Button
          label="Состав навыка"
          variant="quiet"
          onPress={() => router.push('/skill-profile')}
        />
        <Button label="Откуда знания" variant="quiet" onPress={() => router.push('/materials')} />
      </View>
      <View style={{ flex: 1 }}>
        {mode === 'steps' ? (
          <CourseScreen />
        ) : mode === 'tree' ? (
          subject && <CourseTree domain={subject.id} onStart={() => setMode('steps')} />
        ) : (
          <GraphScreen
            onOpenOutline={() => router.push('/skill-profile')}
            onStudy={() => setMode('steps')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
