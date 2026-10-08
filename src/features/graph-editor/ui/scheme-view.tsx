// Схема графа пути (T-0113…T-0117, R-0061): узлы по этапам слева направо, рёбра-предпосылки, легенда,
// состояния освоения, поиск, фильтры, подсветка пути и карточка узла — без выхода со схемы.
// Без новых зависимостей: узлы и рёбра — обычные View, прокрутка и масштаб — ScrollView и transform.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Graph, GraphNode, MasteryMap } from '@/shared/api';
import { Body, Button, Card, Label, Muted, Pill, radius, space, useTheme } from '@/shared/ui';
import {
  highlightPath,
  isFiltering,
  layoutScheme,
  lookOf,
  masteryStates,
  matches,
  NO_FILTERS,
  NODE_H,
  NODE_W,
  scaleOf,
  segmentBetween,
  tagsOf,
  type Filters,
  type MasteryState,
} from '../model/scheme';
import { rememberFlag, remembered } from '../model/remember';
import { SchemeLegend } from './scheme-legend';

const ZOOMS = [0.5, 0.7, 1, 1.3];
const STATE_TEXT: Record<MasteryState, string> = {
  known: 'освоено',
  learning: 'изучаю сейчас',
  frontier: 'можно изучать сейчас',
  locked: 'закрыто: сначала предпосылки',
};

export function SchemeView({
  graph,
  mastery,
  onStudy,
}: {
  graph: Graph;
  mastery: MasteryMap | null;
  /** Открыть курс; шаг по понятию выбирает сам курс. */
  onStudy?: () => void;
}) {
  const { colors } = useTheme();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState(2);
  const [legendOpen, setLegendOpen] = useState(() => remembered('graph-legend-open', true));

  const states = useMemo(() => masteryStates(mastery), [mastery]);
  const layout = useMemo(() => layoutScheme(graph.nodes, collapsed), [graph.nodes, collapsed]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const highlight = useMemo(
    () => (selected ? highlightPath(selected, graph.edges) : null),
    [selected, graph.edges],
  );
  const zoom = ZOOMS[zoomIndex];
  const filtering = isFiltering(filters);
  const selectedNode = selected ? (byId.get(selected) ?? null) : null;

  function toggleStage(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const flag = (key: keyof Omit<Filters, 'query'>, text: string) => (
    <Pressable
      key={key}
      onPress={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
      accessibilityRole="button"
      accessibilityState={{ selected: filters[key] }}
    >
      <Pill text={`${filters[key] ? '✓ ' : ''}${text}`} tone={filters[key] ? 'accent' : 'muted'} />
    </Pressable>
  );

  return (
    <View style={{ gap: space.md }}>
      <SchemeLegend
        open={legendOpen}
        onToggle={() => {
          rememberFlag('graph-legend-open', !legendOpen);
          setLegendOpen(!legendOpen);
        }}
      />

      <TextInput
        value={filters.query}
        onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
        placeholder="найти понятие"
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.sm,
          padding: space.sm,
          color: colors.ink,
          backgroundColor: colors.surface,
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
        {flag('studyNow', 'можно изучать сейчас')}
        {flag('hideKnown', 'скрыть пройденное')}
        {flag('optionalOnly', 'только необязательное')}
        {flag('mineOnly', 'только своё')}
        {filtering && (
          <Pressable onPress={() => setFilters(NO_FILTERS)}>
            <Muted>сбросить</Muted>
          </Pressable>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Button
          label="−"
          variant="quiet"
          disabled={zoomIndex === 0}
          onPress={() => setZoomIndex((i) => Math.max(0, i - 1))}
        />
        <Muted>{Math.round(zoom * 100)}%</Muted>
        <Button
          label="+"
          variant="quiet"
          disabled={zoomIndex === ZOOMS.length - 1}
          onPress={() => setZoomIndex((i) => Math.min(ZOOMS.length - 1, i + 1))}
        />
        <Muted>Этап можно свернуть нажатием на его название</Muted>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceAlt,
          height: 420,
        }}
      >
        <ScrollView horizontal nestedScrollEnabled>
          <ScrollView nestedScrollEnabled>
            <View
              style={{
                width: (layout.width + space.lg * 2) * zoom,
                height: (layout.height + space.lg * 2) * zoom,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: layout.width + space.lg * 2,
                  height: layout.height + space.lg * 2,
                  padding: space.lg,
                  transform: [{ scale: zoom }],
                  transformOrigin: 'top left',
                }}
              >
                <View style={{ position: 'absolute', left: space.lg, top: space.lg }}>
                  {layout.columns.map((c) => (
                    <Pressable
                      key={c.key}
                      onPress={() => toggleStage(c.key)}
                      style={{
                        position: 'absolute',
                        left: c.x,
                        top: 0,
                        width: collapsed.has(c.key) ? 56 : NODE_W,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{ color: colors.muted, fontWeight: '600', fontSize: 12 }}
                      >
                        {collapsed.has(c.key) ? '▸ ' : ''}
                        {c.title} · {c.count}
                      </Text>
                    </Pressable>
                  ))}

                  {graph.edges.map((e) => {
                    const a = layout.positions[e.from];
                    const b = layout.positions[e.to];
                    if (!a || !b) return null;
                    const s = segmentBetween(a, b);
                    const on = highlight?.edges.has(e.id) ?? false;
                    const dim = highlight && !on;
                    return (
                      <View
                        key={e.id}
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          left: s.left,
                          top: s.top,
                          width: s.length,
                          height: on ? 3 : 1.5,
                          backgroundColor: on ? colors.accent : colors.muted,
                          opacity: dim ? 0.12 : e.type === 'prereq' ? 0.55 : 0.3,
                          transform: [{ rotate: `${s.angle}deg` }],
                        }}
                      />
                    );
                  })}

                  {graph.nodes.map((n) => {
                    const p = layout.positions[n.id];
                    if (!p) return null;
                    const state = states[n.id];
                    const look = lookOf(n, state);
                    const inPath = highlight?.nodes.has(n.id) ?? true;
                    const hit = !filtering || matches(n, filters, states);
                    const border =
                      n.id === selected
                        ? colors.accent
                        : look.emphasis === 'frontier'
                          ? colors.accent
                          : look.emphasis === 'learning'
                            ? colors.core
                            : colors.line;
                    return (
                      <Pressable
                        key={n.id}
                        onPress={() => setSelected(n.id === selected ? null : n.id)}
                        accessibilityLabel={`${n.title}${state ? `, ${STATE_TEXT[state]}` : ''}`}
                        style={{
                          position: 'absolute',
                          left: p.x,
                          top: p.y,
                          width: NODE_W,
                          height: NODE_H,
                          paddingHorizontal: space.sm,
                          justifyContent: 'center',
                          borderRadius: n.kind === 'personal' ? NODE_H / 2 : radius.sm,
                          borderWidth: look.emphasis === 'frontier' || n.id === selected ? 2.5 : 1,
                          borderStyle: look.dashed ? 'dashed' : 'solid',
                          borderColor: border,
                          backgroundColor: state === 'locked' ? colors.surfaceAlt : colors.surface,
                          opacity: Math.min(look.opacity, hit ? 1 : 0.15, inPath ? 1 : 0.2),
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                          <View
                            style={{
                              width: 8 * scaleOf(n),
                              height: 8 * scaleOf(n),
                              borderRadius: 8,
                              backgroundColor: state === 'known' ? colors.core : colors.accent,
                            }}
                          />
                          <Text
                            numberOfLines={2}
                            style={{ flex: 1, color: colors.ink, fontSize: 12 }}
                          >
                            {state === 'locked' ? '🔒 ' : ''}
                            {n.title}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      {selectedNode && (
        <NodeCard
          node={selectedNode}
          state={states[selectedNode.id]}
          graph={graph}
          byId={byId}
          onClose={() => setSelected(null)}
          onPick={setSelected}
          onStudy={onStudy}
        />
      )}
    </View>
  );
}

function NodeCard({
  node,
  state,
  graph,
  byId,
  onClose,
  onPick,
  onStudy,
}: {
  node: GraphNode;
  state: MasteryState | undefined;
  graph: Graph;
  byId: Map<string, GraphNode>;
  onClose: () => void;
  onPick: (id: string) => void;
  onStudy?: () => void;
}) {
  const before = graph.edges.filter((e) => e.to === node.id && e.type === 'prereq');
  const after = graph.edges.filter((e) => e.from === node.id && e.type === 'prereq');
  const link = (id: string) => {
    const n = byId.get(id);
    return n ? (
      <Pressable key={id} onPress={() => onPick(id)}>
        <Muted>→ {n.title}</Muted>
      </Pressable>
    ) : null;
  };
  return (
    <Card>
      <Label>{node.title}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {tagsOf(node).map((t) => (
          <Pill key={t} text={t} />
        ))}
        {state && <Pill text={STATE_TEXT[state]} tone={state === 'known' ? 'core' : 'accent'} />}
      </View>
      <Body>{node.content.summary ?? 'Пояснение пока не готово.'}</Body>
      {before.length > 0 && (
        <View style={{ gap: space.xs }}>
          <Muted>Нужно раньше</Muted>
          {before.map((e) => link(e.from))}
        </View>
      )}
      {after.length > 0 && (
        <View style={{ gap: space.xs }}>
          <Muted>Открывает</Muted>
          {after.map((e) => link(e.to))}
        </View>
      )}
      {onStudy && state !== 'locked' && state !== 'known' && (
        <Button label="Изучать" onPress={onStudy} />
      )}
      <Button label="Закрыть" variant="quiet" onPress={onClose} />
    </Card>
  );
}
