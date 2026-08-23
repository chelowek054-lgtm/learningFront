// Рендерер Activity `concept_recall` (WS7): вопрос → открытый ответ → AI-проверка.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '@/entities/session';
import type { ActivityRendererProps, Grade } from '@/shared/engine';
import { getLocalStore, submitForGrading, syncNow } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import { GradeView } from '@/shared/ui';

type Phase = 'edit' | 'submitting' | 'graded' | 'queued';

export function ConceptRecallActivity({ activity }: ActivityRendererProps) {
  const { user } = useSession();
  const online = useIsOnline();
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('edit');
  const [grade, setGrade] = useState<Grade | null>(null);

  const prompt = String((activity.payload as { prompt?: string }).prompt ?? '');

  async function submit() {
    if (!user || !answer.trim()) return;
    setPhase('submitting');
    const store = getLocalStore();
    const responseId = await submitForGrading(store, {
      activityId: activity.id,
      userId: user.id,
      answer,
      jobType: 'grade_concept',
      rubricId: 'concept_check',
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
        /* queued */
      }
    }
    setPhase('queued');
  }

  return (
    <View style={styles.box}>
      <Text style={styles.prompt}>{prompt}</Text>
      {phase !== 'graded' && (
        <>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Ваш ответ…"
            value={answer}
            onChangeText={setAnswer}
            editable={phase === 'edit'}
          />
          <Pressable style={styles.btn} onPress={submit} disabled={phase === 'submitting'}>
            {phase === 'submitting' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Проверить</Text>
            )}
          </Pressable>
          {phase === 'queued' && (
            <Text style={styles.queued}>Сохранено офлайн — проверка придёт при синхронизации.</Text>
          )}
        </>
      )}
      {phase === 'graded' && grade && <GradeView grade={grade} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  prompt: { fontSize: 15, fontWeight: '500' },
  input: {
    minHeight: 100,
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
});
