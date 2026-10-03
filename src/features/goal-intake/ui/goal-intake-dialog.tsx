// Диалог постановки цели (T-0061, R-0033): свободный ввод → уточняющие вопросы (можно не отвечать)
// → пересказ «область, цель, уровень» → подтверждение. Граф без подтверждения не строится.
// Уточнение требует сети и модели: если их нет, вызывающий получает `onFallback` и показывает
// прямую форму ввода.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MASTERY_TARGETS, toSubjectId } from '@/entities/session';
import {
  clarifyGoal,
  confirmGoal,
  summarizeGoal,
  type GoalQuestion,
  type GoalSummary,
} from '@/shared/api';
import {
  Body,
  Button,
  Field,
  font,
  Label,
  Muted,
  Note,
  radius,
  space,
  useTheme,
} from '@/shared/ui';
import {
  answeredCount,
  canAsk,
  canConfirm,
  collectAnswers,
  editSummary,
  recapLine,
} from '../model/dialog';

type Stage = 'ask' | 'clarify' | 'recap';

export function GoalIntakeDialog({
  initialText = '',
  onConfirmed,
  onFallback,
}: {
  initialText?: string;
  onConfirmed: (summary: GoalSummary) => void | Promise<void>;
  onFallback: () => void;
}) {
  const { colors } = useTheme();
  const [stage, setStage] = useState<Stage>('ask');
  const [text, setText] = useState(initialText);
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const r = await clarifyGoal(text.trim());
      setQuestions(r.questions);
      setValues({});
      setStage('clarify');
    } catch {
      // Нет сети или модели: уточнять нечем, остаётся прямая форма.
      onFallback();
    } finally {
      setBusy(false);
    }
  }

  async function recap() {
    setBusy(true);
    setError(null);
    try {
      setSummary(await summarizeGoal(text.trim(), collectAnswers(questions, values)));
      setStage('recap');
    } catch (e) {
      setError(`Не удалось подвести итог: ${String(e).slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!summary || !canConfirm(summary)) return;
    setBusy(true);
    setError(null);
    try {
      await confirmGoal(toSubjectId(summary.area), summary);
      await onConfirmed(summary);
    } catch (e) {
      setError(`Не удалось подтвердить: ${String(e).slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'ask') {
    return (
      <View style={{ gap: space.md }}>
        <Label>Что хотите изучить или повторить?</Label>
        <Field
          placeholder="например: машинное обучение"
          autoFocus
          multiline
          value={text}
          onChangeText={setText}
        />
        {error && <Note tone="danger">{error}</Note>}
        <Button label="Дальше" onPress={() => void ask()} busy={busy} disabled={!canAsk(text)} />
        <Button label="Ввести напрямую" variant="quiet" onPress={onFallback} />
      </View>
    );
  }

  if (stage === 'clarify') {
    return (
      <View style={{ gap: space.md }}>
        <Muted>Пара уточнений, чтобы построить путь точнее. Отвечать на всё не обязательно.</Muted>
        {questions.map((q) => (
          <View key={q.id} style={{ gap: space.xs }}>
            <Label>{q.text}</Label>
            <Field
              placeholder="можно пропустить"
              multiline
              value={values[q.id] ?? ''}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [q.id]: v }))}
            />
          </View>
        ))}
        {error && <Note tone="danger">{error}</Note>}
        <Button
          label={
            answeredCount(collectAnswers(questions, values)) === 0
              ? 'Пропустить уточнения'
              : 'Подвести итог'
          }
          onPress={() => void recap()}
          busy={busy}
        />
        <Button label="Назад" variant="quiet" onPress={() => setStage('ask')} />
      </View>
    );
  }

  if (!summary) return null;
  return (
    <View style={{ gap: space.md }}>
      <Label>Правильно ли понята цель</Label>
      <Body>{recapLine(summary)}</Body>
      <Field
        placeholder="область"
        value={summary.area}
        onChangeText={(v) => setSummary({ ...summary, area: v })}
        onBlur={() => setSummary(editSummary(summary, {}))}
      />
      <Field
        placeholder="цель"
        value={summary.goal}
        onChangeText={(v) => setSummary({ ...summary, goal: v })}
      />
      {summary.wishes.length > 0 && <Muted>Важно: {summary.wishes.join('; ')}</Muted>}

      <Label>До какого уровня</Label>
      <View style={{ gap: space.sm }}>
        {MASTERY_TARGETS.map((t) => {
          const active = summary.level === t.bloom;
          return (
            <Pressable
              key={t.bloom}
              onPress={() => setSummary({ ...summary, level: t.bloom })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: space.md,
                paddingHorizontal: space.md,
                borderRadius: radius.sm,
                backgroundColor: active ? colors.accent : colors.surfaceAlt,
              }}
            >
              <Text
                style={{
                  fontSize: font.body,
                  fontWeight: active ? '600' : '400',
                  color: active ? colors.onAccent : colors.muted,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Muted>Та ли это область? Пока вы не подтвердите, карта не строится.</Muted>
      {error && <Note tone="danger">{error}</Note>}
      <Button
        label="Да, всё верно"
        onPress={() => void confirm()}
        busy={busy}
        disabled={!canConfirm(summary)}
      />
      <Button label="Уточнить заново" variant="quiet" onPress={() => setStage('clarify')} />
    </View>
  );
}
