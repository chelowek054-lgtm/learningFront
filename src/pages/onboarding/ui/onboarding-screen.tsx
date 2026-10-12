// Онбординг: что человек хочет изучать и до какого уровня → profile.
//
// Раньше здесь была анкета двух зашитых областей — целевой балл IELTS и темы
// ML. Приложение обещает «любую базу знаний», а на первом же экране просило
// заполнить чужие поля; пришедший за третьим предметом сразу понимал, что
// приложение не про него.
import { useState } from 'react';
import { View } from 'react-native';

import { MASTERY_TARGETS, toSubjectId, useSession, type TargetBloom } from '@/entities/session';
import {
  ChoiceRow,
  directIntake,
  FAILURE_TEXT,
  GoalIntakeDialog,
  StepHeader,
  subjectOf,
  type FailureKind,
} from '@/features/goal-intake';
import { PriorTestSession } from '@/features/prior-test';
import { SkillProfileEditor } from '@/features/skill-profile';
import { startGraphBuild, updateProfile, type GoalSummary } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import { Button, Card, Display, Field, Label, Muted, Note, Screen, space } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function OnboardingScreen() {
  const { t } = useI18n();
  const { refresh, subject, user } = useSession();
  // При смене предмета подставляем прежние значения — не заставлять набирать заново.
  const [title, setTitle] = useState(subject?.title ?? '');
  const [target, setTarget] = useState<TargetBloom>(subject?.target ?? 'apply');
  // Те же поля цели, что в диалоге: без сети уточнять нечем, но назвать их человек может сам.
  const [goal, setGoal] = useState('');
  const [knows, setKnows] = useState('');
  const [deadline, setDeadline] = useState('');
  const [hours, setHours] = useState('');
  const [format, setFormat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useIsOnline();
  // Уточняющие вопросы требуют сети и модели; без них — прямая форма, как раньше.
  const [direct, setDirect] = useState(false);
  // Почему показана прямая форма: нет сети или помощник не ответил; null — человек выбрал её сам.
  const [why, setWhy] = useState<FailureKind | null>(null);
  // После подтверждённой цели идут шаги 4 («Состав навыка», S-05) и 5 («Проверка уровня», S-06):
  // область запоминаем здесь, пока человек их не пройдёт или не пропустит.
  const [after, setAfter] = useState<{ domain: string; step: 4 | 5 } | null>(null);

  const subjectTitle = title.trim();
  const ready = subjectTitle.length > 1;

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        ...(user?.profile ?? {}),
        onboarded: true,
        subject: {
          id: toSubjectId(subjectTitle),
          title: subjectTitle,
          target,
          // Пока без сети цель не подтверждена на сервере: поля лежат в профиле и пойдут в диалог онлайн.
          intake: directIntake({ goal, knows, deadline, hours, format }),
        },
      });
      await refresh();
    } catch (e) {
      setError(t('onb.saveFailed', { error: String(e) }));
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
    // Сборку графа запускаем сразу: она идёт на сервере в фоне, ход виден на экране карты.
    // Не вышло запустить — на карте останется кнопка «Собрать карту», онбординг не ломаем.
    await startGraphBuild(subject.id).catch(() => undefined);
    // Онбординг не закрываем: дальше состав навыка и проверка уровня (оба шага можно пропустить).
    setAfter({ domain: subject.id, step: 4 });
  }

  if (after) {
    return (
      <Screen>
        <StepHeader step={after.step} />
        {after.step === 4 ? (
          <>
            <View style={{ gap: space.xs }}>
              <Display>{t('onb.skillTitle')}</Display>
              <Muted>{t('onb.skillHint')}</Muted>
            </View>
            <SkillProfileEditor domain={after.domain} />
            <Button label={t('common.next')} onPress={() => setAfter({ ...after, step: 5 })} />
          </>
        ) : (
          <>
            <View style={{ gap: space.xs }}>
              <Display>{t('onb.levelTitle')}</Display>
              <Muted>{t('onb.levelHint')}</Muted>
            </View>
            <PriorTestSession domain={after.domain} />
            <Button label={t('common.done')} onPress={() => void refresh()} />
          </>
        )}
      </Screen>
    );
  }

  if (online && !direct) {
    return (
      <Screen>
        <View style={{ gap: space.xs, marginTop: space.xxl }}>
          <Display>{t('onb.startTitle')}</Display>
          <Muted>{t('onb.startHintDialog')}</Muted>
        </View>
        <GoalIntakeDialog
          initialText={subject?.title ?? ''}
          onConfirmed={confirmed}
          onFallback={(kind) => {
            setWhy(kind ?? null);
            setDirect(true);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader step={1} />
      <View style={{ gap: space.xs }}>
        <Display>{t('onb.startTitle')}</Display>
        <Muted>{t('onb.startHintForm')}</Muted>
      </View>
      {(!online || why) && (
        <Card>
          <Label>{online ? t('onb.helperDown') : t('common.networkOff')}</Label>
          <Muted>{FAILURE_TEXT[!online ? 'offline' : (why ?? 'model')]}</Muted>
          <Muted>{t('onb.draftNote')}</Muted>
        </Card>
      )}

      <Label>{t('onb.whatLearn')}</Label>
      <Field
        placeholder={t('onb.whatLearnPlaceholder')}
        autoFocus
        value={title}
        onChangeText={setTitle}
      />

      <Label>{t('onb.why')}</Label>
      <Field placeholder={t('onb.whyPlaceholder')} value={goal} onChangeText={setGoal} />
      <Label>{t('onb.knows')}</Label>
      <Field
        placeholder={t('onb.knowsPlaceholder')}
        multiline
        value={knows}
        onChangeText={setKnows}
      />
      <Label>{t('onb.terms')}</Label>
      <Field
        placeholder={t('onb.deadlinePlaceholder')}
        value={deadline}
        onChangeText={setDeadline}
      />
      <Field
        placeholder={t('onb.hoursPlaceholder')}
        keyboardType="numeric"
        value={hours}
        onChangeText={setHours}
      />
      <Field placeholder={t('onb.formatPlaceholder')} value={format} onChangeText={setFormat} />

      <Label>{t('onb.toWhatLevel')}</Label>
      {/* Те же формулировки, что на экране проверки уровня: человек читает их
          как свои намерения, а не как ступени таксономии. */}
      <View style={{ gap: space.sm }}>
        {MASTERY_TARGETS.map((t) => (
          <ChoiceRow
            key={t.bloom}
            label={t.label}
            active={target === t.bloom}
            onPress={() => setTarget(t.bloom)}
          />
        ))}
      </View>

      {error && <Note tone="danger">{error}</Note>}

      <Button label={t('common.start')} onPress={finish} busy={busy} disabled={!ready} />
    </Screen>
  );
}
