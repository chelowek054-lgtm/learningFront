// Раздел «Куратор» (R-0060, T-0112): служебные экраны администратора, отдельно от учебных вкладок.
import { useRouter } from 'expo-router';
import { useSession } from '@/entities/session';
import { Card, Empty, Label, Muted, Screen, TopBar } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export default function CuratorRoute() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useSession();
  return (
    <Screen>
      <TopBar title={t('appCurator.1')} onBack={() => router.back()} />
      {user?.is_superuser ? (
        <>
          <Card onPress={() => router.push('/sources')}>
            <Label>{t('appCurator.2')}</Label>
            <Muted>{t('appCurator.3')}</Muted>
          </Card>
          <Card onPress={() => router.push('/activities')}>
            <Label>{t('appCurator.4')}</Label>
            <Muted>{t('appCurator.5')}</Muted>
          </Card>
        </>
      ) : (
        <Empty text={t('appCurator.6')} />
      )}
    </Screen>
  );
}
