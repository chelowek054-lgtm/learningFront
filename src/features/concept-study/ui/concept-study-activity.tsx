// Рендерер `concept_study` (KG5-05): теория узла графа.
// Работает офлайн — весь текст лежит в payload, сети не требуется.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ActivityRendererProps } from '@/shared/engine';

interface Section {
  heading: string;
  body: string;
  examples: string[];
  counter_examples: string[];
}

interface Content {
  summary: string;
  sections: Section[];
  references: { title: string; url: string | null }[];
}

export function ConceptStudyActivity({ activity, onComplete }: ActivityRendererProps) {
  const payload = activity.payload as { title?: string; content?: Content };
  const content = payload.content;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{payload.title ?? 'Концепция'}</Text>
      {content?.summary ? <Text style={styles.summary}>{content.summary}</Text> : null}

      {(content?.sections ?? []).map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}</Text>
          <Text style={styles.body}>{s.body}</Text>
          {s.examples.map((e) => (
            <Text key={e} style={styles.example}>
              — {e}
            </Text>
          ))}
          {s.counter_examples.map((e) => (
            <Text key={e} style={styles.counter}>
              ✗ {e}
            </Text>
          ))}
        </View>
      ))}

      {(content?.references ?? []).length > 0 && (
        <Text style={styles.dim}>
          Источники: {(content?.references ?? []).map((r) => r.title).join(', ')}
        </Text>
      )}

      <Pressable style={styles.btn} onPress={() => onComplete({ activityId: activity.id, userAnswer: { read: true } })}>
        <Text style={styles.btnText}>Разобрался</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  summary: { fontSize: 16, lineHeight: 23 },
  section: { gap: 5, marginTop: 4 },
  heading: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  example: { fontSize: 14, opacity: 0.75, paddingLeft: 8 },
  counter: { fontSize: 14, color: '#b45309', paddingLeft: 8 },
  dim: { fontSize: 13, opacity: 0.6 },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
