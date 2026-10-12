// Профиль навыка (T-0093): экран над фичей; предмет берётся из сессии.
import { useSession } from '@/entities/session';
import { SkillProfileEditor } from '@/features/skill-profile';
import { Empty, Muted, Screen, TopBar } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function SkillProfileScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const { subject } = useSession();
  return (
    <Screen>
      <TopBar title={t('skillProfileSkillProfileScreen.1')} onBack={onBack} />
      {subject ? (
        <>
          <Muted>{t('skillProfileSkillProfileScreen.2')}</Muted>
          <SkillProfileEditor domain={subject.id} />
        </>
      ) : (
        <Empty text={t('skillProfileSkillProfileScreen.3')} />
      )}
    </Screen>
  );
}
