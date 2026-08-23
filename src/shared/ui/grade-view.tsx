// Отображение результата скоринга (Grade). Переиспользуется Writing/Concept.
import { StyleSheet, Text, View } from 'react-native';
import type { Grade } from '@/shared/engine';

export function GradeView({ grade }: { grade: Grade }) {
  return (
    <View style={styles.box}>
      {grade.gradedOfflineFallback && <Text style={styles.draft}>черновая оценка (офлайн)</Text>}
      {grade.overall !== undefined && <Text style={styles.overall}>Overall: {grade.overall}</Text>}

      {grade.criteria.map((c) => (
        <View key={c.name} style={styles.crit}>
          <Text style={styles.critName}>
            {c.name}: {Math.round(c.score * 10) / 10}/{c.max}
          </Text>
          {!!c.comment && <Text style={styles.comment}>{c.comment}</Text>}
        </View>
      ))}

      {grade.errors.length > 0 && (
        <View style={styles.errors}>
          <Text style={styles.errTitle}>Ошибки ({grade.errors.length})</Text>
          {grade.errors.map((e, i) => (
            <Text key={`${e.excerpt}-${i}`} style={styles.err}>
              • {e.excerpt} → {e.correction}
              {e.explanation ? ` (${e.explanation})` : ''}
            </Text>
          ))}
        </View>
      )}

      {!!grade.exemplar && <Text style={styles.exemplar}>Образец: {grade.exemplar}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, marginTop: 8 },
  draft: { fontSize: 12, color: '#b45309', fontStyle: 'italic' },
  overall: { fontSize: 18, fontWeight: '700' },
  crit: { gap: 2 },
  critName: { fontSize: 14, fontWeight: '600' },
  comment: { fontSize: 12, opacity: 0.6 },
  errors: { marginTop: 6, gap: 3 },
  errTitle: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  err: { fontSize: 12 },
  exemplar: { fontSize: 13, marginTop: 6, fontStyle: 'italic', opacity: 0.8 },
});
