// Онбординг: что человек хочет изучать и до какого уровня → profile.
//
// Раньше здесь была анкета двух зашитых областей — целевой балл IELTS и темы
// ML. Приложение обещает «любую базу знаний», а на первом же экране просило
// заполнить чужие поля; пришедший за третьим предметом сразу понимал, что
// приложение не про него.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MASTERY_TARGETS, toSubjectId, useSession, type TargetBloom } from '@/entities/session';
import { GoalIntakeDialog, subjectOf } from '@/features/goal-intake';
import { updateProfile, type GoalSummary } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import {
  Button,
  Display,
  Field,
  font,
  Label,
  Muted,
  Note,
  radius,
  Screen,
  space,
  useTheme,
} from '@/shared/ui';

export function OnboardingScreen() {
  const { colors } = useTheme();
  const { refresh, subject, user } = useSession();
  // При смене предмета подставляем прежние значения — не заставлять набирать заново.
  const [title, setTitle] = useState(subject?.title ?? '');
  const [target, setTarget] = useState<TargetBloom>(subject?.target ?? 'apply');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useIsOnline();
  // Уточняющие вопросы требуют сети и модели; без них — прямая форма, как раньше.
  const [direct, setDirect] = useState(false);

  const subjectTitle = title.trim();
  const ready = subjectTitle.length > 1;

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        ...(user?.profile ?? {}),
        onboarded: true,
        subject: { id: toSubjectId(subjectTitle), title: subjectTitle, target },
      });
      await refresh();
    } catch (e) {
      setError(`Не удалось сохранить: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmed(summary: GoalSummary) {
    // Цель подтверждена на сервере: сохраняем предмет и выходим из онбординга.
    const subject = subjectOf(summary, toSubjectId);
    await updateProfile({
      ...(user?.profile ?? {}),
      onboarded: true,
      subject,
    });
    await refresh();
  }

  if (online && !direct) {
    return (
      <Screen>
        <View style={{ gap: space.xs, marginTop: space.xxl }}>
          <Display>С чего начнём</Display>
          <Muted>Путь строится под предмет — расскажите, чего хотите, своими словами.</Muted>
        </View>
        <GoalIntakeDialog
          initialText={subject?.title ?? ''}
          onConfirmed={confirmed}
          onFallback={() => setDirect(true)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.xxl }}>
        <Display>С чего начнём</Display>
        <Muted>Путь строится под предмет — назовите его своими словами.</Muted>
      </View>

      <Label>Что хотите изучать</Label>
      <Field
        placeholder="например: машинное обучение"
        autoFocus
        value={title}
        onChangeText={setTitle}
      />

      <Label>До какого уровня</Label>
      {/* Те же формулировки, что на экране проверки уровня: человек читает их
          как свои намерения, а не как ступени таксономии. */}
      <View style={{ gap: space.sm }}>
        {MASTERY_TARGETS.map((t) => {
          const active = target === t.bloom;
          return (
            <Pressable
              key={t.bloom}
              onPress={() => setTarget(t.bloom)}
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

      {error && <Note tone="danger">{error}</Note>}

      <Button label="Начать" onPress={finish} busy={busy} disabled={!ready} />
    </Screen>
  );
}
