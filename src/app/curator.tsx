// Раздел «Куратор» (R-0060, T-0112): служебные экраны администратора, отдельно от учебных вкладок.
import { useRouter } from 'expo-router';
import { useSession } from '@/entities/session';
import { Card, Empty, Label, Muted, Screen, TopBar } from '@/shared/ui';

export default function CuratorRoute() {
  const router = useRouter();
  const { user } = useSession();
  return (
    <Screen>
      <TopBar title="Куратор" onBack={() => router.back()} />
      {user?.is_superuser ? (
        <>
          <Card onPress={() => router.push('/sources')}>
            <Label>Источники знаний</Label>
            <Muted>Загрузить учебник в общий граф и следить за разбором</Muted>
          </Card>
          <Card onPress={() => router.push('/activities')}>
            <Label>Разработчику</Label>
            <Muted>Все задания списком — служебный экран</Muted>
          </Card>
        </>
      ) : (
        <Empty text="Раздел доступен только администратору." />
      )}
    </Screen>
  );
}
