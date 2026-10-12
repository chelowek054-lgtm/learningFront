// Служебный экран: все задания списком, с сырыми метаданными.
//
// Раньше этот список жил на «Сегодня» и мешал: человек видел слуги типов и
// подписи про доступность сети вместо одного понятного шага. Как отладочный
// вид он полезен — поэтому не удалён, а вынесен за отдельный вход (профиль).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useSession } from '@/entities/session';
import { getLocalStore } from '@/shared/api';
import type { Activity } from '@/shared/engine';
import { useModuleRegistry } from '@/shared/lib';
import { Body, Card, Empty, Muted, Screen, TopBar } from '@/shared/ui';
import { ActivityDispatcher } from '@/widgets/activity-dispatcher';
import { useI18n } from '@/shared/i18n';

export default function ActivitiesRoute() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useSession();
  const registry = useModuleRegistry();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [running, setRunning] = useState<Activity | null>(null);

  useEffect(() => {
    void (async () => setActivities(await getLocalStore().listActivities()))();
  }, []);

  // Служебный экран только для администратора: по прямому адресу обычному человеку он не открывается (R-0060).
  if (!user?.is_superuser) {
    return (
      <Screen>
        <TopBar title={t('appActivities.1')} onBack={() => router.back()} />
        <Empty text={t('appActivities.2')} />
      </Screen>
    );
  }

  if (running) {
    return (
      <Screen>
        <TopBar title={t('appActivities.3')} onBack={() => setRunning(null)} />
        <ActivityDispatcher activity={running} onComplete={() => setRunning(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={t('appActivities.4')} onBack={() => router.back()} />
      {activities.length === 0 ? (
        <Empty text={t('appActivities.5')} />
      ) : (
        activities.map((a) => (
          <Card key={a.id} onPress={() => setRunning(a)}>
            <Body>{registry.getActivityTitle(a.type)}</Body>
            {/* Служебный экран — здесь сырые метки уместны. */}
            <Muted>
              {a.type} · {a.module} · {a.connectivity}
            </Muted>
          </Card>
        ))
      )}
    </Screen>
  );
}
