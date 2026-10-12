// Источники знаний (T-0079): экран администратора. Учащийся его не видит и API не отдаёт.
import { useSession } from '@/entities/session';
import { GapsCard, SourcesPanel } from '@/features/sources';
import { Muted, Screen, TopBar } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function SourcesScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const { subject } = useSession();
  return (
    <Screen>
      <TopBar title={t('sourcesSourcesScreen.1')} onBack={onBack} />
      <Muted>{t('sourcesSourcesScreen.2')}</Muted>
      {subject && <GapsCard goal={subject.id} />}
      <SourcesPanel />
    </Screen>
  );
}
