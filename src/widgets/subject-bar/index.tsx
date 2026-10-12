// Шапка вкладок: какой предмет открыт и вход в «Мою библиотеку» (T-0111, R-0059, R-0062).
import { Pressable, View } from 'react-native';
import { useSession } from '@/entities/session';
import { Muted, space } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function SubjectBar({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { t } = useI18n();
  const { subject } = useSession();
  if (!subject) return null;
  return (
    <Pressable
      onPress={onOpenLibrary}
      accessibilityRole="button"
      accessibilityLabel={t('subjectBarIndex.1')}
    >
      <View style={{ paddingHorizontal: space.md, paddingTop: space.sm }}>
        <Muted>{t('subjectBarIndex.2', { title: subject.title })}</Muted>
      </View>
    </Pressable>
  );
}
