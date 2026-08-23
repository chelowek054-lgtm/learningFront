// Рендерер Activity `ielts_writing_task2` (WS5): эссе → офлайн-сигнал → скоринг.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '@/entities/session';
import type { ActivityRendererProps, Grade } from '@/shared/engine';
import { getLocalStore, submitForGrading, syncNow } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import { GradeView } from '@/shared/ui';
import { ieltsWritingLocalGrader } from '../lib/local-grader';

type Phase = 'edit' | 'submitting' | 'graded' | 'queued';

export function IeltsWritingActivity({ activity }: ActivityRendererProps) {
  const { user } = useSession();
  const online = useIsOnline();
  const [essay, setEssay] = useState('');
  const [phase, setPhase] = useState<Phase>('edit');
  const [grade, setGrade] = useState<Grade | null>(null);

  const prompt = String((activity.payload as { prompt?: string }).prompt ?? '');

  // Мгновенный черновой сигнал (офлайн-fallback), пересчитывается по мере ввода.
  const draft = useMemo<Grade>(() => {
    const partial = ieltsWritingLocalGrader(essay, activity.payload);
    return {
      rubricId: 'local',
      rubricVersion: 0,
      criteria: partial.criteria ?? [],
      overall: partial.overall,
      errors: partial.errors ?? [],
      gradedOfflineFallback: true,
    };
  }, [essay, activity.payload]);

  async function submit() {
    if (!user || !essay.trim()) return;
    setPhase('submitting');
    const store = getLocalStore();
    const responseId = await submitForGrading(store, {
      activityId: activity.id,
      userId: user.id,
      answer: essay,
      jobType: 'grade_writing',
      rubricId: 'ielts_writing_task2',
    });
    if (online) {
      try {
        await syncNow(store);
        const r = await store.getResponse(responseId);
        if (r?.grade) {
          setGrade(r.grade);
          setPhase('graded');
          return;
        }
      } catch {
        /* упадём в queued */
      }
    }
    setPhase('queued');
  }

  return (
    <View style={styles.box}>
      {!!prompt && <Text style={styles.prompt}>{prompt}</Text>}

      {phase !== 'graded' && (
        <>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Ваше эссе…"
            value={essay}
            onChangeText={setEssay}
            editable={phase === 'edit'}
          />
          <GradeView grade={draft} />
          <Pressable style={styles.btn} onPress={submit} disabled={phase === 'submitting'}>
            {phase === 'submitting' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Отправить на оценку</Text>
            )}
          </Pressable>
          {phase === 'queued' && (
            <Text style={styles.queued}>Сохранено офлайн — оценка придёт при синхронизации.</Text>
          )}
        </>
      )}

      {phase === 'graded' && grade && (
        <View>
          <Text style={styles.done}>Оценка по рубрике IELTS:</Text>
          <GradeView grade={grade} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  prompt: { fontSize: 15, fontWeight: '500' },
  input: {
    minHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  queued: { fontSize: 13, color: '#b45309' },
  done: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
});
