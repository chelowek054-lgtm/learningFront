import { useRouter } from 'expo-router';
import { useSession } from '@/entities/session';
import { SourcesScreen } from '@/pages/sources';
import { Muted, Screen } from '@/shared/ui';

export default function SourcesRoute() {
  const router = useRouter();
  const { isAdmin } = useSession();
  // Прямой переход по адресу не даёт обойти скрытую кнопку: сервер всё равно ответит 403.
  if (!isAdmin) {
    return (
      <Screen>
        <Muted>Этот экран только для администраторов.</Muted>
      </Screen>
    );
  }
  return <SourcesScreen onBack={() => router.back()} />;
}
