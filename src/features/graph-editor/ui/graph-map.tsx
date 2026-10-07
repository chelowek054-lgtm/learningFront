// Карта знаний для учащегося — только чтение.
//
// Прежде и учащийся, и куратор смотрели на один экран редактора: правка узла и
// дорост ветки были открыты всем, а под заголовком узла печаталась служебная
// строка «tier · centrality N · origin · status». Карта нужна человеку, чтобы
// снять тревогу «я не понимаю масштаб», а не чтобы править канон.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getGraph, type Graph, type GraphNode } from '@/shared/api';
import { hasStages, groupByStage, LEVEL_TEXT } from '../model/stage-groups';
import { GoalGate } from './goal-gate';
import { GraphBuildPanel } from './graph-build-panel';
import { Body, Card, Empty, Label, Lead, Muted, Pill, Screen, space, TopBar } from '@/shared/ui';

const EDGE_LABEL: Record<string, string> = {
  prereq: 'нужно раньше',
  specializes: 'частный случай',
  related: 'рядом',
};

export function GraphMap({ domain }: { domain: string; subjectTitle?: string }) {
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

  // Пустая область — не тупик: предмет выбрал человек, ему же и заводить.
  // Пока это было закрыто админом, «появится, как только будет готова» не
  // сбывалось никогда — строить было некому.
  if (nodes.length === 0) {
    return (
      <Screen>
        <GoalGate domain={domain}>
          <GraphBuildPanel domain={domain} onBuilt={setGraph} />
        </GoalGate>
      </Screen>
    );
  }

  if (selected) {
    return (
      <Screen>
        <TopBar title="Карта знаний" onBack={() => setSelectedId(null)} />
        <Lead>{selected.title}</Lead>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Pill
            text={selected.tier === 'core' ? 'Основа' : 'Ответвление'}
            tone={selected.tier === 'core' ? 'core' : 'muted'}
          />
          {selected.reviewStatus === 'draft' && <Pill text="не проверено" />}
        </View>
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

  if (hasStages(nodes)) {
    // Профиль навыка: карта идёт по этапам, у понятия видны уровень и «необязательное».
    return (
      <Screen>
        {groupByStage(nodes).map((g, i) => (
          <Section
            key={g.title}
            title={`${i + 1 <= 99 && g.title !== 'Прочее' ? `${i + 1}. ` : ''}${g.title}`}
            hint=""
            nodes={g.nodes}
            onPick={setSelectedId}
          />
        ))}
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
      {hint !== '' && <Muted>{hint}</Muted>}
      {nodes.map((n) => (
        <Card key={n.id} onPress={() => onPick(n.id)}>
          <Body>{n.title}</Body>
          {(n.level || n.optional) && (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {n.level && <Pill text={LEVEL_TEXT[n.level]} />}
              {n.optional && <Pill text="необязательное" tone="muted" />}
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}
