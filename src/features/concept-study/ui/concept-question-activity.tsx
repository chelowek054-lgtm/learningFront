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
import { useI18n } from '@/shared/i18n';

interface Item {
  prompt: string;
  expected: string;
  options: { text: string; correct: boolean; why: string }[];
  criteria: string[];
}

const PASS = 0.6;

export function ConceptQuestionActivity({ activity, onComplete }: ActivityRendererProps) {
  const { t } = useI18n();
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

  if (!item) return <Muted>{t('conceptStudyConceptQuestionActivity.1')}</Muted>;

  if (result) {
    const passed = result.score >= PASS;
    return (
      <View style={{ gap: space.md }}>
        <Title>
          {passed
            ? t('conceptStudyConceptQuestionActivity.2')
            : t('conceptStudyConceptQuestionActivity.3')}
        </Title>
        <Body>{result.explanation}</Body>
        <Muted>
          {t('m.nodeMastery', {
            percent: Math.round(result.mastery.estimate * 100),
            count: result.mastery.observations,
          })}
        </Muted>
        <Progress value={result.mastery.estimate} />
        {result.stepCompleted && (
          <Note tone="ok">{t('conceptStudyConceptQuestionActivity.4')}</Note>
        )}
        {!result.stepCompleted && !passed && (
          <Note tone="warn">{t('conceptStudyConceptQuestionActivity.5')}</Note>
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
            <Muted>{t('m.criteria', { criteria: item.criteria.join('; ') })}</Muted>
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
            placeholder={t('conceptStudyConceptQuestionActivity.6')}
            placeholderTextColor={colors.muted}
            value={answer}
            onChangeText={setAnswer}
          />
          <Button
            label={t('conceptStudyConceptQuestionActivity.7')}
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
