// Экран курса. Страница — единственный слой, который может свести вместе фичу
// (план курса) и виджет-диспетчер (исполнение активностей); FSD запрещает
// фиче импортировать widgets.
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useSession } from '@/entities/session';
import { CoursePath } from '@/features/course';
import { startStep, type StepActivity } from '@/shared/api';
import type { Activity } from '@/shared/engine';
import { ActivityDispatcher } from '@/widgets/activity-dispatcher';

/** Активность движка из ответа backend: payload несёт всё, что нужно рендереру. */
function toActivity(a: StepActivity, userId: string): Activity {
  return {
    id: a.id,
    userId,
    module: 'knowledge',
    type: a.type,
    connectivity: a.connectivity,
    payload: a.payload,
    createdAt: new Date().toISOString(),
  };
}

export function CourseScreen({ domain = 'ml' }: { domain?: string }) {
  const { user } = useSession();
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

  if (busy) return <ActivityIndicator style={styles.pad} />;

  if (running) {
    const activity = running[index];
    const last = index >= running.length - 1;
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Pressable onPress={back}>
            <Text style={styles.link}>← К плану курса</Text>
          </Pressable>
          <Text style={styles.dim}>
            шаг · {index + 1} из {running.length} · {activity.type}
          </Text>
          <ActivityDispatcher
            key={activity.id}
            activity={toActivity(activity, user?.id ?? '')}
            onComplete={() => (last ? back() : setIndex(index + 1))}
          />
          {!last && (
            <Pressable onPress={() => setIndex(index + 1)}>
              <Text style={styles.link}>Дальше →</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {error && <Text style={styles.error}>{error}</Text>}
      <CoursePath domain={domain} onStartStep={begin} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: 16, gap: 12 },
  dim: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase' },
  link: { color: '#2563eb', fontSize: 15 },
  error: { color: '#dc2626', padding: 16 },
});
