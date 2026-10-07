// Профиль навыка (T-0093): экран над фичей; предмет берётся из сессии.
import { useSession } from '@/entities/session';
import { SkillProfileEditor } from '@/features/skill-profile';
import { Empty, Muted, Screen, TopBar } from '@/shared/ui';

export function SkillProfileScreen({ onBack }: { onBack?: () => void }) {
  const { subject } = useSession();
  return (
    <Screen>
      <TopBar title="Профиль навыка" onBack={onBack} />
      {subject ? (
        <>
          <Muted>Что нужно знать для вашей цели, по областям и этапам. Можно поправить.</Muted>
          <SkillProfileEditor domain={subject.id} />
        </>
      ) : (
        <Empty text="Сначала выберите предмет." />
      )}
    </Screen>
  );
}
