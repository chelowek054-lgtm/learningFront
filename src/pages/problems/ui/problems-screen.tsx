// Пул проблем (T-0158): экран администратора. Учащийся его не видит, сервер отвечает 403.
import { ProblemPool } from '@/features/claim-problems';
import { Screen, TopBar } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function ProblemsScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  return (
    <Screen>
      <TopBar title={t('problems.title')} onBack={onBack} />
      <ProblemPool />
    </Screen>
  );
}
