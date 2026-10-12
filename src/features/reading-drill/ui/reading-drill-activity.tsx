// Рендерер Activity `reading_drill` (T-0036): текст, вопросы, таймер, мгновенный результат.
// Работает без сети: задание уже лежит на устройстве, проверка локальная. До сдачи
// можно свободно переходить между вопросами и текстом — всё на одном экране.
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSession } from '@/entities/session';
import type { ActivityRendererProps } from '@/shared/engine';
import { createJobQueue, getLocalStore } from '@/shared/api';
import { newId } from '@/shared/lib';
import {
  Body,
  Button,
  Card,
  Field,
  Label,
  Lead,
  Muted,
  Note,
  radius,
  space,
  useTheme,
} from '@/shared/ui';
import {
  answeredCount,
  formatClock,
  gradeReading,
  parseReadingDrill,
  secondsLeft,
  toGrade,
  wrongChoiceIds,
  type ReadingQuestion,
  type ReadingResult,
} from '../model/reading-model';
import { useI18n, translate } from '@/shared/i18n';

const TFNG = ['true', 'false', 'not given'];
const TFNG_LABEL: Record<string, string> = {
  get true() {
    return translate('readingDrillReadingDrillActivity.1');
  },
  get false() {
    return translate('readingDrillReadingDrillActivity.2');
  },
  'not given': translate('readingDrillReadingDrillActivity.3'),
};

export function ReadingDrillActivity({ activity, onComplete }: ActivityRendererProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useSession();
  const drill = parseReadingDrill(activity.payload);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const submitted = useRef(false);

  const left = drill ? secondsLeft(drill.timeLimitSec, startedAt.current, now) : null;

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [result]);

  async function submit(byTimeout: boolean) {
    if (!drill || submitted.current) return;
    submitted.current = true;
    const graded = gradeReading(drill, answers);
    setResult(graded);
    setTimedOut(byTimeout);
    if (user) {
      // Результат — в общий журнал ответов: оттуда его читает экран прогресса.
      await getLocalStore().appendResponse({
        id: newId(),
        activityId: activity.id,
        userId: user.id,
        userAnswer: answers,
        grade: toGrade(graded, byTimeout),
        localCreatedAt: new Date().toISOString(),
        synced: false,
      });
      // Разбор «почему неверно» приходит фоновой задачей при сети и дрилл не блокирует.
      const queue = createJobQueue(getLocalStore());
      for (const questionId of wrongChoiceIds(drill, graded)) {
        await queue.enqueue({
          id: newId(),
          userId: user.id,
          type: 'explain_distractors',
          inputRef: { activityId: activity.id, questionId },
        });
      }
    }
  }

  // Время вышло — сдаём то, что отвечено, а не теряем попытку.
  useEffect(() => {
    if (left === 0 && !result) void submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, result]);

  if (!drill) return <Note tone="danger">{t('readingDrillReadingDrillActivity.4')}</Note>;

  const detail = (id: string) => result?.details.find((d) => d.id === id);

  function choose(q: ReadingQuestion, value: string) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function optionRow(q: ReadingQuestion, value: string, label: string) {
    const picked = answers[q.id] === value;
    const d = detail(q.id);
    const isExpected = result && d?.expected === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        onPress={() => choose(q, value)}
        style={{
          borderWidth: 1,
          borderColor: isExpected ? colors.ok : picked ? colors.accent : colors.line,
          borderRadius: radius.sm,
          padding: space.md,
        }}
      >
        <Body>
          {picked ? '● ' : '○ '}
          {label}
        </Body>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {!!drill.title && <Lead>{drill.title}</Lead>}
      {left !== null && !result && (
        <Note tone={left <= 60 ? 'danger' : 'warn'}>Осталось {formatClock(left)}</Note>
      )}

      <Card>
        <Body>{drill.passage}</Body>
      </Card>

      {drill.questions.map((q, i) => {
        const d = detail(q.id);
        return (
          <Card key={q.id}>
            <Label>
              Вопрос {i + 1} из {drill.questions.length}
              {d
                ? d.correct
                  ? t('readingDrillReadingDrillActivity.5')
                  : t('readingDrillReadingDrillActivity.6')
                : ''}
            </Label>
            <Body>{q.prompt}</Body>
            {q.type === 'mcq' && (q.options ?? []).map((o) => optionRow(q, o, o))}
            {q.type === 'tfng' && TFNG.map((o) => optionRow(q, o, TFNG_LABEL[o]))}
            {q.type === 'gap' && (
              <Field
                value={answers[q.id] ?? ''}
                onChangeText={(v) => choose(q, v)}
                editable={!result}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('readingDrillReadingDrillActivity.7')}
              />
            )}
            {d && !d.correct && (
              <Muted>
                {t('readingDrillReadingDrillActivity.8', { expected: d.expected })}
                {d.explanation ? ` — ${d.explanation}` : ''}
              </Muted>
            )}
          </Card>
        );
      })}

      {result ? (
        <>
          <Note tone={result.fraction >= 0.7 ? 'ok' : 'warn'}>
            {t('readingDrillReadingDrillActivity.9', {
              correct: result.correct,
              total: result.total,
            })}
            {timedOut ? t('readingDrillReadingDrillActivity.10') : ''}
          </Note>
          <Button
            label={t('readingDrillReadingDrillActivity.11')}
            onPress={() => onComplete({ activityId: activity.id, userAnswer: answers })}
          />
        </>
      ) : (
        <>
          {answeredCount(drill, answers) < drill.questions.length && (
            <Muted>
              Без ответа: {drill.questions.length - answeredCount(drill, answers)}. Можно сдать и
              {t('readingDrillReadingDrillActivity.12')}
            </Muted>
          )}
          <Button
            label={t('readingDrillReadingDrillActivity.13')}
            onPress={() => void submit(false)}
          />
        </>
      )}
    </View>
  );
}
