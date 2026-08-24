// Рендерер `concept_contrast` / `concept_apply` (KG5-05): задание по теории узла.
// Ответ уходит в backend, оттуда возвращается оценка и сдвинутая освоенность —
// именно она, а не нажатие кнопки, закрывает шаг курса.
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { answerStep, type StepResult } from '@/shared/api';
import type { ActivityRendererProps } from '@/shared/engine';
import {
  Body,
  Button,
  Lead,
  Muted,
  Note,
  Progress,
  radius,
  space,
  Title,
  useTheme,
} from '@/shared/ui';

interface Item {
  prompt: string;
  expected: string;
  options: { text: string; correct: boolean; why: string }[];
  criteria: string[];
}

const PASS = 0.6;

export function ConceptQuestionActivity({ activity, onComplete }: ActivityRendererProps) {
  const { colors } = useTheme();
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

  if (!item) return <Muted>Задание не сгенерировано.</Muted>;

  if (result) {
    const passed = result.score >= PASS;
    return (
      <View style={{ gap: space.md }}>
        <Title>{passed ? 'Верно' : 'Неверно'}</Title>
        <Body>{result.explanation}</Body>
        <Muted>
          Освоенность узла: {Math.round(result.mastery.estimate * 100)}% · ответов{' '}
          {result.mastery.observations}
        </Muted>
        <Progress value={result.mastery.estimate} />
        {result.stepCompleted && <Note tone="ok">Шаг курса закрыт.</Note>}
        {!result.stepCompleted && !passed && (
          <Note tone="warn">Узел вернётся в повторение — к нему ещё придём.</Note>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Lead>{item.prompt}</Lead>

      {item.options.length > 0 ? (
        item.options.map((o, i) => (
          <Pressable
            key={o.text}
            onPress={() => send(i)}
            disabled={busy}
            style={({ pressed }) => ({
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              padding: space.lg,
              opacity: pressed || busy ? 0.7 : 1,
            })}
          >
            <Body>{o.text}</Body>
          </Pressable>
        ))
      ) : (
        <>
          {item.criteria.length > 0 && (
            <Muted>Что будет проверяться: {item.criteria.join('; ')}</Muted>
          )}
          <TextInput
            style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              color: colors.ink,
              borderRadius: radius.sm,
              padding: space.md,
              fontSize: 15,
              minHeight: 96,
              textAlignVertical: 'top',
            }}
            multiline
            placeholder="ответьте своими словами"
            placeholderTextColor={colors.muted}
            value={answer}
            onChangeText={setAnswer}
          />
          <Button
            label="Ответить"
            onPress={() => send(answer)}
            disabled={!answer.trim()}
            busy={busy}
          />
        </>
      )}

      {error && <Note tone="danger">{error}</Note>}
    </View>
  );
}
