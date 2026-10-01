// Рендерер Activity `code_task` (T-0011): условие → моноширинный редактор →
// ревью по рубрике. Решение сохраняется локально по мере набора, поэтому
// работа не пропадает ни без сети, ни при закрытии приложения.
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSession } from '@/entities/session';
import type { ActivityRendererProps, Grade } from '@/shared/engine';
import { getLocalStore, submitForGrading, syncNow } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import { Body, Button, Field, GradeView, Lead, Muted, Note, useTheme } from '@/shared/ui';
import { clearDraft, loadDraft, saveDraft } from '../model/code-draft';

type Phase = 'edit' | 'submitting' | 'graded' | 'queued';

/** Через сколько после последней правки писать черновик на диск. */
const SAVE_DELAY_MS = 600;

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

interface CodeTaskPayload {
  statement?: string;
  language?: string;
  starter?: string;
}

export function CodeTaskActivity({ activity }: ActivityRendererProps) {
  const { colors } = useTheme();
  const { user } = useSession();
  const online = useIsOnline();
  const payload = activity.payload as CodeTaskPayload;
  const [code, setCode] = useState(payload.starter ?? '');
  const [phase, setPhase] = useState<Phase>('edit');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);

  // Восстановить черновик: он важнее заготовки из условия.
  useEffect(() => {
    let alive = true;
    void loadDraft(getLocalStore(), activity.id).then((draft) => {
      if (!alive) return;
      if (draft) {
        setCode(draft);
        setRestored(true);
      }
      loaded.current = true;
    });
    return () => {
      alive = false;
    };
  }, [activity.id]);

  // Автосохранение с задержкой; пока черновик не прочитан, заготовкой его не затираем.
  useEffect(() => {
    if (!loaded.current || phase !== 'edit') return;
    const t = setTimeout(() => void saveDraft(getLocalStore(), activity.id, code), SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [code, activity.id, phase]);

  async function submit() {
    if (!user || !code.trim()) return;
    setPhase('submitting');
    const store = getLocalStore();
    const responseId = await submitForGrading(store, {
      activityId: activity.id,
      userId: user.id,
      answer: code,
      jobType: 'grade_code',
      rubricId: 'ml_code_review',
    });
    await clearDraft(store, activity.id);
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
        /* остаётся в очереди */
      }
    }
    setPhase('queued');
  }

  const styles = StyleSheet.create({
    editor: {
      minHeight: 220,
      padding: 12,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
      fontFamily: MONO,
      fontSize: 14,
      textAlignVertical: 'top',
    },
  });

  return (
    <View style={{ gap: 10 }}>
      <Lead>{payload.statement ?? 'Условие задачи не пришло.'}</Lead>
      {!!payload.language && <Muted>Язык: {payload.language}</Muted>}

      {phase !== 'graded' && (
        <>
          <Field
            style={styles.editor}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholder="Ваше решение…"
            value={code}
            onChangeText={setCode}
            editable={phase === 'edit'}
          />
          {restored && phase === 'edit' && <Muted>Восстановлен сохранённый черновик.</Muted>}
          <Button
            label="Отправить на ревью"
            onPress={() => void submit()}
            busy={phase === 'submitting'}
            disabled={!code.trim()}
          />
          {phase === 'queued' && (
            <Note tone="warn">Решение сохранено — ревью придёт при синхронизации.</Note>
          )}
        </>
      )}

      {phase === 'graded' && grade && <GradeView grade={grade} />}
      {phase === 'graded' && !grade && <Body>Ревью недоступно.</Body>}
    </View>
  );
}
