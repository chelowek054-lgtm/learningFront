// Рендерер Activity `listening_drill` (T-0037): запись, ограниченное число прослушиваний, вопросы.
// Запись скачивается в кэш при сети и дальше играет без неё; текст учащемуся не показывается.
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSession } from '@/entities/session';
import { getLocalStore } from '@/shared/api';
import type { ActivityRendererProps } from '@/shared/engine';
import { gradeQuestions, type QuizQuestion, type QuizResult } from '@/shared/engine';
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
import { cachedUri, ensureCached } from '../model/audio-cache';
import {
  listenBlocker,
  parseListeningDrill,
  playsLeft,
  type AudioState,
} from '../model/listening-model';
import { addPlay, getPlays } from '../model/plays-store';
import { useI18n, translate } from '@/shared/i18n';

/** Результат в общем виде оценки: попадает в журнал ответов и метрики прогресса. */
function toGrade(r: QuizResult) {
  return {
    rubricId: 'listening_drill',
    rubricVersion: 1,
    criteria: [
      {
        name: translate('listeningDrillListeningDrillActivity.1'),
        score: r.correct,
        max: r.total,
        comment: '',
      },
    ],
    overall: r.correct,
    errors: [],
  };
}

export function ListeningDrillActivity({ activity, onComplete }: ActivityRendererProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useSession();
  const drill = parseListeningDrill(activity.payload);
  const [uri, setUri] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioState>('checking');
  const [used, setUsed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const player = useAudioPlayer(uri);

  useEffect(() => {
    if (!drill) return;
    let alive = true;
    void (async () => {
      setUsed(await getPlays(activity.id));
      const have = cachedUri(activity.id) ?? (await ensureCached(activity.id, drill.audioPath));
      if (!alive) return;
      setUri(have);
      setAudio(have ? 'cached' : 'missing');
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  if (!drill) return <Note tone="danger">{t('listeningDrillListeningDrillActivity.2')}</Note>;

  const blocker = listenBlocker(audio, drill.maxPlays, used);

  async function listen() {
    if (blocker) return;
    setUsed(await addPlay(activity.id)); // сначала фиксируем: выход с экрана не вернёт попытку
    player.seekTo(0);
    player.play();
  }

  async function submit() {
    if (!drill || result) return;
    const graded = gradeQuestions(drill.questions, answers);
    setResult(graded);
    if (user) {
      await getLocalStore().appendResponse({
        id: newId(),
        activityId: activity.id,
        userId: user.id,
        userAnswer: answers,
        grade: toGrade(graded),
        localCreatedAt: new Date().toISOString(),
        synced: false,
      });
    }
  }

  const detail = (id: string) => result?.details.find((d) => d.id === id);

  function option(q: QuizQuestion, value: string) {
    const picked = answers[q.id] === value;
    const expected = result && detail(q.id)?.expected === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        onPress={() => !result && setAnswers((p) => ({ ...p, [q.id]: value }))}
        style={{
          borderWidth: 1,
          borderColor: expected ? colors.ok : picked ? colors.accent : colors.line,
          borderRadius: radius.sm,
          padding: space.md,
        }}
      >
        <Body>
          {picked ? '● ' : '○ '}
          {value}
        </Body>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {!!drill.title && <Lead>{drill.title}</Lead>}
      <Card>
        <Label>
          Прослушиваний осталось: {playsLeft(drill.maxPlays, used)} из {drill.maxPlays}
        </Label>
        {blocker ? <Muted>{blocker}</Muted> : null}
        <Button
          label={t('listeningDrillListeningDrillActivity.3')}
          onPress={() => void listen()}
          disabled={!!blocker}
        />
      </Card>

      {drill.questions.map((q, i) => {
        const d = detail(q.id);
        return (
          <Card key={q.id}>
            <Label>
              Вопрос {i + 1} из {drill.questions.length}
              {d
                ? d.correct
                  ? t('listeningDrillListeningDrillActivity.4')
                  : t('listeningDrillListeningDrillActivity.5')
                : ''}
            </Label>
            <Body>{q.prompt}</Body>
            {q.type === 'gap' ? (
              <Field
                value={answers[q.id] ?? ''}
                onChangeText={(v) => !result && setAnswers((p) => ({ ...p, [q.id]: v }))}
                editable={!result}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('listeningDrillListeningDrillActivity.6')}
              />
            ) : (
              (q.type === 'tfng' ? ['true', 'false', 'not given'] : (q.options ?? [])).map((o) =>
                option(q, o),
              )
            )}
            {d && !d.correct && (
              <Muted>
                {t('listeningDrillListeningDrillActivity.7', { expected: d.expected })}
                {d.explanation ? ` — ${d.explanation}` : ''}
              </Muted>
            )}
          </Card>
        );
      })}

      {result ? (
        <>
          <Note tone={result.fraction >= 0.7 ? 'ok' : 'warn'}>
            {t('listeningDrillListeningDrillActivity.8', {
              correct: result.correct,
              total: result.total,
            })}
          </Note>
          <Button
            label={t('listeningDrillListeningDrillActivity.9')}
            onPress={() => onComplete({ activityId: activity.id, userAnswer: answers })}
          />
        </>
      ) : (
        <Button
          label={t('listeningDrillListeningDrillActivity.10')}
          onPress={() => void submit()}
        />
      )}
    </View>
  );
}
