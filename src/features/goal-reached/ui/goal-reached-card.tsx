// «Цель достигнута» (T-0106, R-0057): три пути дальше — выше, шире или другое.
import { useState } from 'react';
import { nextTarget, useSession } from '@/entities/session';
import { buildCourse, updateProfile } from '@/shared/api';
import { Body, Button, Card, Label, Muted, Note } from '@/shared/ui';

export function GoalReachedCard({ onAddArea }: { onAddArea: () => void }) {
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
      await updateProfile({
        ...profile,
        subject: { ...(profile.subject as object), target: higher.bloom },
      });
      await buildCourse(subject.id, higher.bloom);
      await refresh();
    } catch {
      setError('Не удалось поднять уровень. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function another() {
    await updateProfile({ ...(user?.profile ?? {}), onboarded: false });
    await refresh();
  }

  return (
    <Card tone="accent">
      <Label>Цель достигнута</Label>
      <Body>{subject.title}: всё освоено до выбранного уровня</Body>
      <Muted>
        Можно пойти выше, шире или взяться за другое — повторение продолжит удерживать знания.
      </Muted>
      {error && <Note tone="danger">{error}</Note>}
      {higher && (
        <Button
          label={`Поднять уровень: ${higher.short.toLowerCase()}`}
          onPress={() => void raise()}
          busy={busy}
        />
      )}
      <Button label="Добавить область" variant="quiet" onPress={onAddArea} />
      <Button label="Новый предмет" variant="quiet" onPress={() => void another()} />
    </Card>
  );
}
