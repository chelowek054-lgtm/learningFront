// Экран карты знаний. Роль решает, что показать: учащемуся — карта для чтения,
// администратору — курирование канона. Права выражены структурой, а не
// россыпью проверок внутри одного общего экрана.
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/entities/session';
import { GraphCuration, GraphMap } from '@/features/graph-editor';
import { Empty, space, Title, useTheme } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function GraphScreen({
  onOpenOutline,
  onStudy,
}: {
  onOpenOutline?: () => void;
  /** Открыть шаг курса; понятие, которое человек выбрал на схеме, передаётся, чтобы шаг был по нему. */
  onStudy?: (conceptId?: string) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { isAdmin, subject } = useSession();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <Title>
          {subject ? t('graphGraphScreen.1', { title: subject.title }) : t('graphGraphScreen.3')}
        </Title>
      </View>
      {!subject ? (
        <Empty text={t('graphGraphScreen.2')} />
      ) : isAdmin ? (
        <GraphCuration domain={subject.id} onOpenOutline={onOpenOutline} />
      ) : (
        <GraphMap
          domain={subject.id}
          subjectTitle={subject.title}
          onOpenOutline={onOpenOutline}
          onStudy={onStudy}
        />
      )}
    </SafeAreaView>
  );
}
