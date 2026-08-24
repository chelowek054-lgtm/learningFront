// Экран плейсмента — тонкая обёртка над фичей (FSD: страница не держит логику).
import { PlacementSession } from '@/features/placement';
import { Screen, TopBar } from '@/shared/ui';

export function PlacementScreen({
  domain = 'ml',
  onBack,
}: {
  domain?: string;
  onBack?: () => void;
}) {
  return (
    <Screen scroll={false}>
      <TopBar title="Определить уровень" onBack={onBack} />
      <PlacementSession domain={domain} />
    </Screen>
  );
}
