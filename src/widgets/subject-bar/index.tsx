// Шапка вкладок: какой предмет открыт и вход в «Мою библиотеку» (T-0111, R-0059, R-0062).
import { Pressable, View } from 'react-native';
import { useSession } from '@/entities/session';
import { Muted, space } from '@/shared/ui';

export function SubjectBar({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { subject } = useSession();
  if (!subject) return null;
  return (
    <Pressable
      onPress={onOpenLibrary}
      accessibilityRole="button"
      accessibilityLabel="Сменить предмет: открыть Мою библиотеку"
    >
      <View style={{ paddingHorizontal: space.md, paddingTop: space.sm }}>
        <Muted>{subject.title} · сменить предмет →</Muted>
      </View>
    </Pressable>
  );
}
