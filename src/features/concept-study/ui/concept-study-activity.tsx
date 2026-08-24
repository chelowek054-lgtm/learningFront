// Рендерер `concept_study` (KG5-05): теория узла графа.
// Работает офлайн — весь текст лежит в payload, сети не требуется.
import { View } from 'react-native';
import type { ActivityRendererProps } from '@/shared/engine';
import { Body, Button, Lead, Muted, Note, space, Title } from '@/shared/ui';

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
    <View style={{ gap: space.md }}>
      <Title>{payload.title ?? 'Концепция'}</Title>
      {content?.summary ? <Lead>{content.summary}</Lead> : null}

      {(content?.sections ?? []).map((s) => (
        <View key={s.heading} style={{ gap: space.sm }}>
          <Body>{s.heading}</Body>
          <Body>{s.body}</Body>
          {s.examples.map((e) => (
            <View key={e} style={{ paddingLeft: space.md }}>
              <Muted>— {e}</Muted>
            </View>
          ))}
          {/* Заблуждения выделены смыслом, а не украшением: их надо заметить. */}
          {s.counter_examples.map((e) => (
            <View key={e} style={{ paddingLeft: space.md }}>
              <Note tone="warn">✗ {e}</Note>
            </View>
          ))}
        </View>
      ))}

      {(content?.references ?? []).length > 0 && (
        <Muted>Источники: {(content?.references ?? []).map((r) => r.title).join(', ')}</Muted>
      )}

      <Button
        label="Разобрался"
        onPress={() => onComplete({ activityId: activity.id, userAnswer: { read: true } })}
      />
    </View>
  );
}
