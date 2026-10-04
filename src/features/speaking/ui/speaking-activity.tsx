// Рендерер Activity `speaking_response` (T-0040, T-0042): запись ответа голосом без сети.
// Файл ждёт в очереди на устройстве и уходит при синхронизации; разбор приходит позже.
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSession } from '@/entities/session';
import { getLocalStore, queueVoice } from '@/shared/api';
import type { ActivityRendererProps } from '@/shared/engine';
import { newId } from '@/shared/lib';
import { Body, Button, Card, Lead, Muted, Note, space } from '@/shared/ui';
import { formatSec, parseSpeakingTask, sendBlocker } from '../model/speaking-model';

export function SpeakingActivity({ activity, onComplete }: ActivityRendererProps) {
  const { user } = useSession();
  const task = parseSpeakingTask(activity.payload);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 500);
  const [error, setError] = useState<string | null>(null);
  const [recordedSec, setRecordedSec] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  // Лимит ответа: по его исходу запись останавливается сама, а не обрезается молча.
  useEffect(() => {
    if (task && state.isRecording && (state.durationMillis ?? 0) >= task.maxSec * 1000) {
      void stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.durationMillis, state.isRecording]);

  if (!task) return <Note tone="danger">Задание повреждено: темы ответа нет.</Note>;

  async function start() {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Нет доступа к микрофону: разрешите его в настройках устройства.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordedSec(null);
  }

  async function stop() {
    await recorder.stop();
    setRecordedSec(Math.floor((state.durationMillis ?? 0) / 1000));
  }

  async function send() {
    if (!user || !recorder.uri) return;
    const responseId = newId();
    await getLocalStore().appendResponse({
      id: responseId,
      activityId: activity.id,
      userId: user.id,
      userAnswer: { audio: 'pending' },
      grade: null,
      localCreatedAt: new Date().toISOString(),
      synced: false,
    });
    await queueVoice(getLocalStore(), {
      userId: user.id,
      responseId,
      uri: recorder.uri,
      mime: 'audio/m4a',
    });
    setSent(true);
  }

  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const blocker = recordedSec === null ? null : sendBlocker(recordedSec);

  return (
    <View style={{ gap: space.md }}>
      <Lead>Устный ответ</Lead>
      <Card>
        <Body>{task.prompt}</Body>
        <Muted>Можно говорить до {formatSec(task.maxSec)}. Запись сохранится без сети.</Muted>
      </Card>

      {error && <Note tone="danger">{error}</Note>}
      {sent ? (
        <>
          <Note tone="ok">
            Ответ записан. Он уйдёт на проверку при подключении к сети, запись на устройстве после
            отправки удаляется. Разбор появится после синхронизации.
          </Note>
          <Button
            label="Готово"
            onPress={() => onComplete({ activityId: activity.id, userAnswer: { audio: 'queued' } })}
          />
        </>
      ) : state.isRecording ? (
        <>
          <Note tone="warn">Идёт запись: {formatSec(seconds)}</Note>
          <Button label="Остановить" onPress={() => void stop()} />
        </>
      ) : (
        <>
          {blocker && <Note tone="warn">{blocker}</Note>}
          <Button
            label={recordedSec === null ? 'Начать запись' : 'Записать заново'}
            onPress={() => void start()}
          />
          {recordedSec !== null && !blocker && (
            <Button label="Отправить на проверку" onPress={() => void send()} />
          )}
        </>
      )}
    </View>
  );
}
