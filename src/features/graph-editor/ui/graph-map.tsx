// Карта знаний для учащегося — только чтение.
//
// Прежде и учащийся, и куратор смотрели на один экран редактора: правка узла и
// дорост ветки были открыты всем, а под заголовком узла печаталась служебная
// строка «tier · centrality N · origin · status». Карта нужна человеку, чтобы
// снять тревогу «я не понимаю масштаб», а не чтобы править канон.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getGraph, type Graph, type GraphNode } from '@/shared/api';
import { Body, Card, Empty, Label, Lead, Muted, Pill, Screen, space, TopBar } from '@/shared/ui';

const EDGE_LABEL: Record<string, string> = {
  prereq: 'нужно раньше',
  specializes: 'частный случай',
  related: 'рядом',
};

export function GraphMap({ domain }: { domain: string }) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setGraph(await getGraph(domain));
    } catch {
      setFailed(true);
    }
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  const nodes = graph?.nodes ?? [];
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const neighbors = useMemo(() => {
    if (!graph || !selected) return [];
    const byId = new Map(graph.nodes.map((n) => [n.id, n.title]));
    return graph.edges
      .filter((e) => e.from === selected.id || e.to === selected.id)
      .map((e) => {
        const out = e.from === selected.id;
        const other = byId.get(out ? e.to : e.from) ?? '—';
        return { title: other, relation: EDGE_LABEL[e.type] ?? e.type, out };
      });
  }, [graph, selected]);

  if (failed) return <Empty text="Не удалось загрузить карту. Потяните вниз позже." />;
  if (!graph) return <ActivityIndicator style={{ marginTop: space.xxl }} />;

  if (nodes.length === 0) {
    return (
      <Empty text="Карта этой области ещё не построена. Она появится здесь, как только будет готова." />
    );
  }

  if (selected) {
    return (
      <Screen>
        <TopBar title="Карта знаний" onBack={() => setSelectedId(null)} />
        <Lead>{selected.title}</Lead>
        <Pill
          text={selected.tier === 'core' ? 'Основа' : 'Ответвление'}
          tone={selected.tier === 'core' ? 'core' : 'muted'}
        />
        <Body>{selected.content.summary ?? 'Пояснение пока не готово.'}</Body>

        <Label>Связи</Label>
        {neighbors.length === 0 ? (
          <Muted>Пока не связано с другими темами</Muted>
        ) : (
          neighbors.map((n, i) => (
            <Muted key={`${n.title}-${i}`}>
              {n.out ? '→' : '←'} {n.title} · {n.relation}
            </Muted>
          ))
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Section
        title="Основа"
        hint="Без этого остальное не встанет"
        nodes={nodes.filter((n) => n.tier === 'core')}
        onPick={setSelectedId}
      />
      <Section
        title="Ответвления"
        hint="Отдельные темы поверх основы"
        nodes={nodes.filter((n) => n.tier !== 'core')}
        onPick={setSelectedId}
      />
    </Screen>
  );
}

function Section({
  title,
  hint,
  nodes,
  onPick,
}: {
  title: string;
  hint: string;
  nodes: GraphNode[];
  onPick: (id: string) => void;
}) {
  if (nodes.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Label>
        {title} · {nodes.length}
      </Label>
      <Muted>{hint}</Muted>
      {nodes.map((n) => (
        <Card key={n.id} onPress={() => onPick(n.id)}>
          <Body>{n.title}</Body>
        </Card>
      ))}
    </View>
  );
}
