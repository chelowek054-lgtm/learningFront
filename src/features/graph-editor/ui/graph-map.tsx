// Карта знаний для учащегося — только чтение.
//
// Прежде и учащийся, и куратор смотрели на один экран редактора: правка узла и
// дорост ветки были открыты всем, а под заголовком узла печаталась служебная
// строка «tier · centrality N · origin · status». Карта нужна человеку, чтобы
// снять тревогу «я не понимаю масштаб», а не чтобы править канон.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  getGraph,
  getProfile,
  masteryMap,
  type Graph,
  type GraphNode,
  type MasteryMap,
} from '@/shared/api';
import { isPending, POLL_MS } from '../model/build-progress';
import { hasStages, groupByStage, LEVEL_TEXT } from '../model/stage-groups';
import { GoalGate } from './goal-gate';
import { GraphBuildPanel } from './graph-build-panel';
import { SchemeView } from './scheme-view';
import {
  Body,
  Button,
  Card,
  Empty,
  Label,
  Lead,
  Muted,
  Note,
  Pill,
  Screen,
  space,
  TopBar,
} from '@/shared/ui';

const EDGE_LABEL: Record<string, string> = {
  prereq: 'нужно раньше',
  specializes: 'частный случай',
  related: 'рядом',
};

export function GraphMap({
  domain,
  onOpenOutline,
  onStudy,
}: {
  domain: string;
  subjectTitle?: string;
  onOpenOutline?: () => void;
  onStudy?: () => void;
}) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [building, setBuilding] = useState(false);
  const [mastery, setMastery] = useState<MasteryMap | null>(null);
  const [mode, setMode] = useState<'scheme' | 'list'>('scheme');

  const load = useCallback(async () => {
    try {
      setGraph(await getGraph(domain));
      // Освоенность нужна схеме для состояний; без неё схема остаётся читаемой.
      setMastery(await masteryMap(domain).catch(() => null));
      // Готовые области видны сразу; пока остальные дособираются, это сказано словами, а не молчанием.
      setBuilding(isPending(await getProfile(domain).catch(() => null)));
    } catch {
      setFailed(true);
    }
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!building) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [building, load]);

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
          <GraphBuildPanel domain={domain} onBuilt={setGraph} onOpenOutline={onOpenOutline} />
        </GoalGate>
      </Screen>
    );
  }

  if (mode === 'scheme' && !selected) {
    return (
      <Screen>
        {building && (
          <Note tone="warn">Карта ещё дособирается: готовые области уже можно открыть.</Note>
        )}
        <ModeSwitch mode={mode} onChange={setMode} />
        <SchemeView graph={graph} mastery={mastery} onStudy={onStudy} />
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
        {building && (
          <Note tone="warn">Карта ещё дособирается: готовые области уже можно открыть.</Note>
        )}
        <ModeSwitch mode={mode} onChange={setMode} />
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
      {building && (
        <Note tone="warn">Карта ещё дособирается: готовые области уже можно открыть.</Note>
      )}
      <ModeSwitch mode={mode} onChange={setMode} />
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

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: 'scheme' | 'list';
  onChange: (m: 'scheme' | 'list') => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Button
        label="Схема"
        variant={mode === 'scheme' ? 'primary' : 'quiet'}
        onPress={() => onChange('scheme')}
      />
      <Button
        label="Список"
        variant={mode === 'list' ? 'primary' : 'quiet'}
        onPress={() => onChange('list')}
      />
    </View>
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
