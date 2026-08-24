// Отображение результата скоринга (Grade). Переиспользуется Writing/Concept.
import { View } from 'react-native';
import type { Grade } from '@/shared/engine';
import { Body, Lead, Muted, Note } from './kit';
import { space } from './theme';

export function GradeView({ grade }: { grade: Grade }) {
  return (
    <View style={{ gap: space.sm, marginTop: space.sm }}>
      {grade.gradedOfflineFallback && <Note tone="warn">черновая оценка (офлайн)</Note>}
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
          <Note tone="danger">Ошибки ({grade.errors.length})</Note>
          {grade.errors.map((e, i) => (
            <Muted key={`${e.excerpt}-${i}`}>
              • {e.excerpt} → {e.correction}
              {e.explanation ? ` (${e.explanation})` : ''}
            </Muted>
          ))}
        </View>
      )}

      {!!grade.exemplar && <Muted>Образец: {grade.exemplar}</Muted>}
    </View>
  );
}
