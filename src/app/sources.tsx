import { useRouter } from 'expo-router';
import { useSession } from '@/entities/session';
import { SourcesScreen } from '@/pages/sources';
import { Muted, Screen } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export default function SourcesRoute() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAdmin } = useSession();
  // Прямой переход по адресу не даёт обойти скрытую кнопку: сервер всё равно ответит 403.
  if (!isAdmin) {
    return (
      <Screen>
        <Muted>{t('m.adminOnly')}</Muted>
      </Screen>
    );
  }
  return <SourcesScreen onBack={() => router.back()} />;
}
