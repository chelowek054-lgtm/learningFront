// Вкладка «Путь»: шаги курса и карта знаний — два взгляда на один путь (R-0059, T-0111).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CourseTree } from '@/features/graph-editor';
import { useSession } from '@/entities/session';
import { CourseScreen } from '@/pages/course';
import { GraphScreen } from '@/pages/graph';
import { Button, SegmentedControl, space, useTheme } from '@/shared/ui';
import { SubjectBar } from '@/widgets/subject-bar';
import { useI18n, translate } from '@/shared/i18n';

type PathMode = 'steps' | 'tree' | 'map';
const MODES: readonly { value: PathMode; label: string }[] = [
  {
    value: 'steps',
    get label() {
      return translate('appPath.1');
    },
  },
  {
    value: 'tree',
    get label() {
      return translate('appPath.2');
    },
  },
  {
    value: 'map',
    get label() {
      return translate('appPath.3');
    },
  },
];

export default function PathTab() {
  const { t } = useI18n();
  const router = useRouter();
  const { colors } = useTheme();
  const [mode, setMode] = useState<PathMode>('steps');
  // Понятие, выбранное на схеме: «Изучать» открывает шаг по нему, а не общий курс (T-0116).
  const [studyConcept, setStudyConcept] = useState<string | null>(null);
  const study = (conceptId?: string) => {
    setStudyConcept(conceptId ?? null);
    setMode('steps');
  };
  const { subject } = useSession();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SubjectBar onOpenLibrary={() => router.push('/library')} />
      <View style={{ gap: space.sm, padding: space.md }}>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Button
            label={t('appPath.4')}
            variant="quiet"
            onPress={() => router.push('/skill-profile')}
          />
          <Button
            label={t('appPath.5')}
            variant="quiet"
            onPress={() => router.push('/materials')}
          />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {mode === 'steps' ? (
          <CourseScreen
            startConceptId={studyConcept}
            onStartHandled={() => setStudyConcept(null)}
          />
        ) : mode === 'tree' ? (
          subject && <CourseTree domain={subject.id} title={subject.title} onStart={study} />
        ) : (
          <GraphScreen onOpenOutline={() => router.push('/skill-profile')} onStudy={study} />
        )}
      </View>
    </SafeAreaView>
  );
}
