// Заслон перед построением карты (T-0061, R-0033): пока цель по области не подтверждена,
// кнопки построения недоступны. Цели, поставленные прямой формой или до появления диалога,
// подтверждаются здесь одним нажатием по тому, что человек уже указал.
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import { targetLabel, useSession } from '@/entities/session';
import { confirmGoal, getGoalIntake } from '@/shared/api';
import { Button, Card, Label, Muted, Note, space } from '@/shared/ui';

type State = 'loading' | 'confirmed' | 'unconfirmed' | 'unreachable';

export function GoalGate({ domain, children }: { domain: string; children: ReactNode }) {
  const { subject } = useSession();
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState('loading');
    getGoalIntake(domain)
      .then((r) => setState(r.confirmed ? 'confirmed' : 'unconfirmed'))
      .catch(() => setState('unreachable'));
  }, [domain]);

  async function confirm() {
    if (!subject) return;
    setBusy(true);
    setError(null);
    try {
      await confirmGoal(domain, {
        area: subject.title,
        goal: subject.title,
        level: subject.target,
        wishes: [],
      });
      setState('confirmed');
    } catch (e) {
      setError(`Не удалось подтвердить: ${String(e).slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <ActivityIndicator style={{ marginTop: space.lg }} />;
  if (state === 'confirmed') return <>{children}</>;

  if (state === 'unreachable') {
    return <Note tone="warn">Нет связи с сервером: построение карты доступно только онлайн.</Note>;
  }

  return (
    <Card>
      <Label>Подтвердите цель</Label>
      <Muted>
        Карта строится после подтверждения: область «{subject?.title ?? domain}», уровень —{' '}
        {subject ? targetLabel(subject.target) : 'не указан'}.
      </Muted>
      {error && <Note tone="danger">{error}</Note>}
      <Button label="Да, цель верна" onPress={() => void confirm()} busy={busy} />
    </Card>
  );
}
