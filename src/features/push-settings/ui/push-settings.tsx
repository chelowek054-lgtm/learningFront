// Карточка «Уведомления» в профиле (T-0086): включить и отключить push о курсе.
import { useCallback, useEffect, useState } from 'react';
import {
  getPushState,
  obtainPushToken,
  pushSupported,
  registerPushDevice,
  setPushEnabled,
  type PushState,
} from '@/shared/api';
import { Button, Card, Label, Muted, Note } from '@/shared/ui';
import { describePush, type FailureReason } from '../model/push-model';

export function PushSettings() {
  const [server, setServer] = useState<PushState | null>(null);
  const [failure, setFailure] = useState<FailureReason | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();

  const refresh = useCallback(async () => {
    try {
      setServer(await getPushState());
    } catch {
      /* без сети карточка остаётся в прежнем виде */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const view = describePush(server, supported, failure);

  async function toggle() {
    setBusy(true);
    setFailure(null);
    try {
      if (view.action === 'disable') {
        setServer(await setPushEnabled(false));
      } else if (view.action === 'enable') {
        const got = await obtainPushToken();
        if (!got.ok) {
          setFailure(got.reason);
        } else {
          await registerPushDevice(got.token, got.platform);
          setServer(await setPushEnabled(true));
        }
      }
    } catch {
      setFailure('failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Label>Уведомления</Label>
      <Muted>{view.label}</Muted>
      <Note tone={failure ? 'warn' : 'ok'}>{view.hint}</Note>
      {view.action && (
        <Button
          label={view.actionLabel}
          variant="quiet"
          onPress={() => void toggle()}
          busy={busy}
        />
      )}
    </Card>
  );
}
