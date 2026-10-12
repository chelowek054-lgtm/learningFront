// Карта знаний для учащегося — только чтение.
//
// Прежде и учащийся, и куратор смотрели на один экран редактора: правка узла и
// дорост ветки были открыты всем, а под заголовком узла печаталась служебная
// строка «tier · centrality N · origin · status». Карта нужна человеку, чтобы
// снять тревогу «я не понимаю масштаб», а не чтобы править канон.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { dropEdit, loadCache, pendingEdits, saveCache, type PendingEdit } from '../model/offline';
import { ApiError, createOwnNode, createUserEdge } from '@/shared/api';
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
import { useI18n, translate } from '@/shared/i18n';

const EDGE_LABEL: Record<string, string> = {
  get prereq() {
    return translate('graphEditorGraphMap.1');
  },
  get specializes() {
    return translate('graphEditorGraphMap.2');
  },
  get related() {
    return translate('graphEditorGraphMap.3');
  },
};

/** Применить одну отложенную правку. */
async function applyEdit(e: PendingEdit): Promise<void> {
  if (e.kind === 'add-node') {
    const made = await createOwnNode(e.domain, e.title, e.summary);
    if (e.linkTo) await createUserEdge(e.domain, e.linkTo, made.userConceptId);
  } else {
    await createUserEdge(e.domain, e.from, e.to);
  }
}

/**
 * Отложенные правки личного слоя уходят по одной и удаляются из очереди сразу после успеха.
 * Нет сети — стоп до следующей загрузки; отказ сервера (4xx) значит, что правка уже не пройдёт, её убираем,
 * чтобы она не блокировала загрузку графа навсегда.
 */
async function replayQueue(domain: string): Promise<void> {
  for (const e of pendingEdits().filter((x) => x.domain === domain)) {
    try {
      await applyEdit(e);
      dropEdit(e);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        dropEdit(e);
        continue;
      }
      return;
    }
  }
}

export function GraphMap({
  domain,
  subjectTitle,
  onOpenOutline,
  onStudy,
}: {
  domain: string;
  subjectTitle?: string;
  onOpenOutline?: () => void;
  /** Открыть шаг курса; понятие, которое человек выбрал на схеме, передаётся, чтобы шаг был по нему. */
  onStudy?: (conceptId?: string) => void;
}) {
  const { t } = useI18n();
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [building, setBuilding] = useState(false);
  const [mastery, setMastery] = useState<MasteryMap | null>(null);
  const [mode, setMode] = useState<'scheme' | 'list'>('scheme');

  const loading = useRef(false);

  const load = useCallback(async () => {
    // Опрос и повторные вызовы не должны гнать очередь параллельно: иначе правки задвоятся.
    if (loading.current) return;
    loading.current = true;
    try {
      await replayQueue(domain);
      const fresh = await getGraph(domain);
      saveCache(`graph:${domain}`, fresh);
      setGraph(fresh);
      // Освоенность нужна схеме для состояний; без неё схема остаётся читаемой.
      setMastery(await masteryMap(domain).catch(() => null));
      // Готовые области видны сразу; пока остальные дособираются, это сказано словами, а не молчанием.
      setBuilding(isPending(await getProfile(domain).catch(() => null)));
    } catch {
      // Без сети схема читается из последнего сохранённого графа.
      const cached = loadCache<Graph>(`graph:${domain}`);
      if (cached) setGraph(cached);
      else setFailed(true);
    } finally {
      loading.current = false;
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

  if (failed) return <Empty text={t('graphEditorGraphMap.4')} />;
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
        {building && <Note tone="warn">{t('graphEditorGraphMap.5')}</Note>}
        <ModeSwitch mode={mode} onChange={setMode} />
        <SchemeView
          graph={graph}
          mastery={mastery}
          domain={domain}
          onStudy={onStudy}
          onChanged={() => void load()}
          fullscreenTitle={t('m.mapTitle', { title: subjectTitle ?? domain })}
        />
      </Screen>
    );
  }

  if (selected) {
    return (
      <Screen>
        <TopBar title={t('graphEditorGraphMap.6')} onBack={() => setSelectedId(null)} />
        <Lead>{selected.title}</Lead>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Pill
            text={
              selected.tier === 'core' ? t('graphEditorGraphMap.7') : t('graphEditorGraphMap.8')
            }
            tone={selected.tier === 'core' ? 'core' : 'muted'}
          />
          {selected.reviewStatus === 'draft' && <Pill text={t('graphEditorGraphMap.9')} />}
        </View>
        <Body>{selected.content.summary ?? t('graphEditorGraphMap.10')}</Body>

        <Label>{t('graphEditorGraphMap.11')}</Label>
        {neighbors.length === 0 ? (
          <Muted>{t('graphEditorGraphMap.12')}</Muted>
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
        {building && <Note tone="warn">{t('graphEditorGraphMap.5')}</Note>}
        <ModeSwitch mode={mode} onChange={setMode} />
        {groupByStage(nodes).map((g, i) => (
          <Section
            key={g.title}
            title={`${i + 1 <= 99 && g.title !== t('graphEditorStageGroups.1') ? `${i + 1}. ` : ''}${g.title}`}
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
      {building && <Note tone="warn">{t('graphEditorGraphMap.5')}</Note>}
      <ModeSwitch mode={mode} onChange={setMode} />
      <Section
        title={t('graphEditorGraphMap.7')}
        hint={t('graphEditorGraphMap.13')}
        nodes={nodes.filter((n) => n.tier === 'core')}
        onPick={setSelectedId}
      />
      <Section
        title={t('graphEditorGraphMap.14')}
        hint={t('graphEditorGraphMap.15')}
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
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Button
        label={t('graphEditorGraphMap.16')}
        variant={mode === 'scheme' ? 'primary' : 'quiet'}
        onPress={() => onChange('scheme')}
      />
      <Button
        label={t('graphEditorGraphMap.17')}
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
  const { t } = useI18n();
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
              {n.optional && <Pill text={t('graphEditorGraphMap.18')} tone="muted" />}
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}
