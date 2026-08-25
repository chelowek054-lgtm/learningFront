// Экран плейсмента — тонкая обёртка над фичей (FSD: страница не держит логику).
import { useSession } from '@/entities/session';
import { PlacementSession } from '@/features/placement';
import { Empty, Screen, TopBar } from '@/shared/ui';

export function PlacementScreen({ onBack }: { onBack?: () => void }) {
  const { subject } = useSession();
  return (
    <Screen scroll={false}>
      <TopBar title="Определить уровень" onBack={onBack} />
      {subject ? (
        <PlacementSession domain={subject.id} />
      ) : (
        <Empty text="Сначала выберите предмет." />
      )}
    </Screen>
  );
}
