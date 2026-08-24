// Рендерер `concept_contrast` / `concept_apply` (KG5-05): задание по теории узла.
// Ответ уходит в backend, оттуда возвращается оценка и сдвинутая освоенность —
// именно она, а не нажатие кнопки, закрывает шаг курса.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { answerStep, type StepResult } from '@/shared/api';
import type { ActivityRendererProps } from '@/shared/engine';

interface Item {
  prompt: string;
  expected: string;
  options: { text: string; correct: boolean; why: string }[];
  criteria: string[];
}

export function ConceptQuestionActivity({ activity, onComplete }: ActivityRendererProps) {
  const payload = activity.payload as { domain?: string; conceptId?: string; item?: Item };
  const item = payload.item;
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StepResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(value: unknown) {
    if (!payload.domain || !payload.conceptId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await answerStep(payload.domain, payload.conceptId, activity.id, value);
      setResult(r);
      // Ответ уже оценён и записан на backend — сюда отдаём только черновик для движка.
      onComplete({ activityId: activity.id, userAnswer: value });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!item) return <Text style={styles.dim}>Задание не сгенерировано.</Text>;

  if (result) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.verdict, result.score >= 0.6 ? styles.ok : styles.bad]}>
          {result.score >= 0.6 ? 'Верно' : 'Неверно'}
        </Text>
        <Text style={styles.body}>{result.explanation}</Text>
        <Text style={styles.dim}>
          Освоенность узла: {Math.round(result.mastery.estimate * 100)}% · ответов{' '}
          {result.mastery.observations}
        </Text>
        {result.stepCompleted && <Text style={styles.ok}>Шаг курса закрыт.</Text>}
        {!result.stepCompleted && result.score < 0.6 && (
          <Text style={styles.dim}>Узел вернётся в повторение — к нему ещё придём.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{item.prompt}</Text>

      {item.options.length > 0 ? (
        item.options.map((o, i) => (
          <Pressable key={o.text} style={styles.option} onPress={() => send(i)} disabled={busy}>
            <Text style={styles.body}>{o.text}</Text>
          </Pressable>
        ))
      ) : (
        <>
          {item.criteria.length > 0 && (
            <Text style={styles.dim}>Что будет проверяться: {item.criteria.join('; ')}</Text>
          )}
          <TextInput
            style={styles.input}
            multiline
            placeholder="ответьте своими словами"
            value={answer}
            onChangeText={setAnswer}
          />
          <Pressable
            style={styles.btn}
            onPress={() => send(answer)}
            disabled={busy || !answer.trim()}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Ответить</Text>}
          </Pressable>
        </>
      )}

      {error && <Text style={styles.bad}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  prompt: { fontSize: 18, fontWeight: '500', lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 22 },
  dim: { fontSize: 13, opacity: 0.6, lineHeight: 19 },
  verdict: { fontSize: 20, fontWeight: '700' },
  ok: { color: '#15803d' },
  bad: { color: '#dc2626' },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 14,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
