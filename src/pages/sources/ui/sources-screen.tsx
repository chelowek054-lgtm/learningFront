// Источники знаний (T-0079): экран администратора. Учащийся его не видит и API не отдаёт.
import { useSession } from '@/entities/session';
import { GapsCard, SourcesPanel } from '@/features/sources';
import { Muted, Screen, TopBar } from '@/shared/ui';

export function SourcesScreen({ onBack }: { onBack?: () => void }) {
  const { subject } = useSession();
  return (
    <Screen>
      <TopBar title="Источники знаний" onBack={onBack} />
      <Muted>Учебники, из которых строится общий граф. Видно только администраторам.</Muted>
      {subject && <GapsCard goal={subject.id} />}
      <SourcesPanel />
    </Screen>
  );
}
