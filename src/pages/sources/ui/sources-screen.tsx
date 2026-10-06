// Источники знаний (T-0079): экран администратора. Учащийся его не видит и API не отдаёт.
import { SourcesPanel } from '@/features/sources';
import { Muted, Screen, TopBar } from '@/shared/ui';

export function SourcesScreen({ onBack }: { onBack?: () => void }) {
  return (
    <Screen>
      <TopBar title="Источники знаний" onBack={onBack} />
      <Muted>Учебники, из которых строится общий граф. Видно только администраторам.</Muted>
      <SourcesPanel />
    </Screen>
  );
}
