// Отображение результата скоринга (Grade). Переиспользуется Writing/Concept.
import { View } from 'react-native';
import { Body, Lead, Muted, Note } from './kit';
import { space } from './theme';
import { useI18n } from '@/shared/i18n';

/** Что показывает отображение. Форма совпадает с Grade движка, но UI-кит движка не знает (A-0023). */
export interface GradeViewData {
  gradedOfflineFallback?: boolean;
  caveat?: string;
  overall?: number;
  criteria: { name: string; score: number; max: number; comment?: string }[];
  errors: { excerpt: string; correction: string; explanation?: string }[];
  exemplar?: string;
}

export function GradeView({ grade }: { grade: GradeViewData }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.sm, marginTop: space.sm }}>
      {grade.gradedOfflineFallback && <Note tone="warn">{t('sharedGradeView.1')}</Note>}
      {!!grade.caveat && <Note tone="warn">{grade.caveat}</Note>}
      {grade.overall !== undefined && <Lead>Overall: {grade.overall}</Lead>}

      {grade.criteria.map((c) => (
        <View key={c.name} style={{ gap: space.xs }}>
          <Body>
            {c.name}: {Math.round(c.score * 10) / 10}/{c.max}
          </Body>
          {!!c.comment && <Muted>{c.comment}</Muted>}
        </View>
      ))}

      {grade.errors.length > 0 && (
        <View style={{ marginTop: space.xs, gap: space.xs }}>
          <Note tone="danger">{t('sharedGradeView.2', { length: grade.errors.length })}</Note>
          {grade.errors.map((e, i) => (
            <Muted key={`${e.excerpt}-${i}`}>
              • {e.excerpt} → {e.correction}
              {e.explanation ? ` (${e.explanation})` : ''}
            </Muted>
          ))}
        </View>
      )}

      {!!grade.exemplar && <Muted>{t('sharedGradeView.3', { exemplar: grade.exemplar })}</Muted>}
    </View>
  );
}
