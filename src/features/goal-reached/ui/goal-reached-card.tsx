// «Цель достигнута» (T-0106, R-0057): три пути дальше — выше, шире или другое.
import { useState } from 'react';
import { nextTarget, useSession } from '@/entities/session';
import { buildCourse, updateProfile } from '@/shared/api';
import { Body, Button, Card, Label, Muted, Note } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function GoalReachedCard({ onAddArea }: { onAddArea: () => void }) {
  const { t } = useI18n();
  const { user, subject, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!subject) return null;
  const higher = nextTarget(subject.target);

  async function raise() {
    if (!subject || !higher) return;
    setBusy(true);
    setError(null);
    try {
      const profile = user?.profile ?? {};
      // Сначала курс: если он не построился, цель в профиле не меняется, и повтор не перескочит ступень.
      await buildCourse(subject.id, higher.bloom);
      await updateProfile({
        ...profile,
        subject: { ...(profile.subject as object), target: higher.bloom },
      });
      await refresh();
    } catch {
      setError(t('goalReachedGoalReachedCard.1'));
    } finally {
      setBusy(false);
    }
  }

  async function another() {
    try {
      await updateProfile({ ...(user?.profile ?? {}), onboarded: false });
      await refresh();
    } catch {
      setError(t('goalReachedGoalReachedCard.2'));
    }
  }

  return (
    <Card tone="accent">
      <Label>{t('goalReachedGoalReachedCard.3')}</Label>
      <Body>{t('goalReachedGoalReachedCard.4', { title: subject.title })}</Body>
      <Muted>
        {higher ? t('goalReachedGoalReachedCard.5') : t('goalReachedGoalReachedCard.6')}
      </Muted>
      {error && <Note tone="danger">{error}</Note>}
      {higher && (
        <Button
          label={`Поднять уровень: ${higher.short.toLowerCase()}`}
          onPress={() => void raise()}
          busy={busy}
        />
      )}
      <Button label={t('goalReachedGoalReachedCard.7')} variant="quiet" onPress={onAddArea} />
      <Button
        label={t('goalReachedGoalReachedCard.8')}
        variant="quiet"
        onPress={() => void another()}
      />
    </Card>
  );
}
