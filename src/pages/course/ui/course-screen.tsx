// Экран курса. Страница — единственный слой, который может свести вместе фичу
// (план курса) и виджет-диспетчер (исполнение активностей); FSD запрещает
// фиче импортировать widgets.
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/entities/session';
import { CoursePath } from '@/features/course';
import { startStep, type StepActivity } from '@/shared/api';
import type { Activity } from '@/shared/engine';
import { useModuleRegistry } from '@/shared/lib';
import { Button, Empty, Label, Note, space, TopBar, useTheme } from '@/shared/ui';
import { ActivityDispatcher } from '@/widgets/activity-dispatcher';

/** Активность движка из ответа backend: payload несёт всё, что нужно рендереру. */
function toActivity(a: StepActivity, userId: string, moduleId: string): Activity {
  return {
    id: a.id,
    userId,
    module: moduleId,
    type: a.type,
    connectivity: a.connectivity,
    payload: a.payload,
    createdAt: new Date().toISOString(),
  };
}

// STEP_LABEL здесь больше нет: названия типов живут в ActivityTypeDef, иначе
// словарь разъезжается — на «Сегодня» те же типы печатались слугами.

export function CourseScreen() {
  const { user, subject } = useSession();
  const registry = useModuleRegistry();
  const domain = subject?.id ?? '';
  const { colors } = useTheme();
  const [running, setRunning] = useState<StepActivity[] | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin(conceptId: string) {
    setBusy(true);
    setError(null);
    try {
      const started = await startStep(domain, conceptId);
      setRunning(started.activities);
      setIndex(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setRunning(null);
    setIndex(0);
  }

  // Без предмета строить нечего: домен пустой, и запрос ушёл бы в /graph/course/.
  if (!subject) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: space.lg }}>
          <Empty text="Сначала выберите предмет — курс строится под него." />
        </View>
      </SafeAreaView>
    );
  }

  if (busy) return <ActivityIndicator style={{ marginTop: space.xxl }} />;

  if (running) {
    const activity = running[index];
    const last = index >= running.length - 1;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
          <TopBar title={registry.getActivityTitle(activity.type)} onBack={back} />
          <Label>{`шаг ${index + 1} из ${running.length}`}</Label>
          <ActivityDispatcher
            key={activity.id}
            activity={toActivity(
              activity,
              user?.id ?? '',
              registry.getModuleIdForType(activity.type) ?? '',
            )}
            onComplete={() => (last ? back() : setIndex(index + 1))}
          />
          {!last && <Button label="Дальше" variant="quiet" onPress={() => setIndex(index + 1)} />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {error && (
        <View style={{ padding: space.lg }}>
          <Note tone="danger">{error}</Note>
        </View>
      )}
      <CoursePath domain={domain} onStartStep={begin} />
    </SafeAreaView>
  );
}
