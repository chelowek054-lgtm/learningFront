// Экран карты знаний. Роль решает, что показать: учащемуся — карта для чтения,
// администратору — курирование канона. Права выражены структурой, а не
// россыпью проверок внутри одного общего экрана.
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/entities/session';
import { GraphCuration, GraphMap } from '@/features/graph-editor';
import { Empty, space, Title, useTheme } from '@/shared/ui';

export function GraphScreen() {
  const { colors } = useTheme();
  const { isAdmin, subject } = useSession();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Title>{subject ? `Карта знаний · ${subject.title}` : 'Карта знаний'}</Title>
      </View>
      {!subject ? (
        <Empty text="Сначала выберите предмет — карта строится под него." />
      ) : isAdmin ? (
        <GraphCuration domain={subject.id} />
      ) : (
        <GraphMap domain={subject.id} />
      )}
    </SafeAreaView>
  );
}
