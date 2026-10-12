// Схема графа пути (T-0113…T-0117, R-0061): узлы по этапам слева направо, рёбра-предпосылки, легенда,
// состояния освоения, поиск, фильтры, подсветка пути и карточка узла — без выхода со схемы.
// Без новых зависимостей: узлы и рёбра — обычные View, прокрутка и масштаб — ScrollView и transform.
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import {
  ApiError,
  createOwnNode,
  createUserEdge,
  deleteOwnNode,
  patchUserNode,
  type Graph,
  type GraphNode,
  type MasteryMap,
} from '@/shared/api';
import { SchemeCanvas, STATE_TEXT } from './scheme-canvas';
import { SchemeFullscreen } from './scheme-fullscreen';
import { StageControls, StageLinksCard } from './stage-controls';
import { useSchemeScene } from './use-scheme-scene';
import { stageTitleOf } from '../model/overview';
import type { LegendMode } from '../model/legend';
import { queueEdit } from '../model/offline';
import {
  Body,
  Button,
  Card,
  Chip,
  Field,
  Label,
  Muted,
  Pill,
  radius,
  space,
  useTheme,
} from '@/shared/ui';
import {
  highlightPath,
  isFiltering,
  layoutScheme,
  masteryEstimates,
  masteryStates,
  NO_FILTERS,
  tagsOf,
  type Filters,
  type MasteryState,
} from '../model/scheme';
import { rememberFlag, remembered } from '../model/remember';
import { SchemeLegend } from './scheme-legend';
import { translate, useI18n } from '@/shared/i18n';

const ZOOMS = [0.5, 0.7, 1, 1.3];

export function SchemeView({
  graph,
  mastery,
  onStudy,
  studyLabel = translate('graphEditorSchemeView.1'),
  domain,
  onChanged,
  fullscreenTitle = translate('graphEditorSchemeView.2'),
  mode = 'map',
}: {
  graph: Graph;
  domain?: string;
  onChanged?: () => void;
  mastery: MasteryMap | null;
  /** Открыть курс; шаг по понятию выбирает сам курс. */
  onStudy?: (conceptId?: string) => void;
  studyLabel?: string;
  /** Подпись в шапке полноэкранного режима: какой предмет и какой режим. */
  fullscreenTitle?: string;
  /** «map» — понятия канона; «tree» — шаги курса: у них своя легенда (T-0137). */
  mode?: LegendMode;
}) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoomIndex, setZoomIndex] = useState(2);
  const [fullscreen, setFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(() => remembered('graph-legend-open', true));

  const states = useMemo(() => masteryStates(mastery, graph.nodes), [mastery, graph.nodes]);
  const estimates = useMemo(() => masteryEstimates(mastery), [mastery]);
  const layout = useMemo(() => layoutScheme(graph.nodes, collapsed), [graph.nodes, collapsed]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const highlight = useMemo(
    () => (selected ? highlightPath(selected, graph.edges) : null),
    [selected, graph.edges],
  );
  function toggleStage(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const [ownTitle, setOwnTitle] = useState('');
  const scene = useSchemeScene({
    graph,
    states,
    layout,
    highlight,
    selected,
    setSelected,
    mode,
    collapsed,
    plainToggleStage: toggleStage,
  });
  const stageTitle = (key: string) => stageTitleOf(graph.nodes, key);
  const [note, setNote] = useState<string | null>(null);
  const zoom = ZOOMS[zoomIndex];

  // Своё понятие (T-0115): добавляется в личный слой, канон не меняется; связь — от выбранного понятия.
  async function addOwn() {
    const title = ownTitle.trim();
    if (!title || !domain) return;
    const from = selected;
    let madeId: string | null = null;
    try {
      const made = await createOwnNode(domain, title, title);
      madeId = made.userConceptId;
      if (from) await createUserEdge(domain, from, madeId);
      setNote(t('graphEditorSchemeView.3'));
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        setNote(t('graphEditorSchemeView.4'));
      } else if (madeId && from) {
        // Узел уже создан: в очередь идёт только связь, иначе при повторе появился бы второй узел.
        queueEdit({ kind: 'add-edge', domain, from, to: madeId });
        setNote(t('graphEditorSchemeView.5'));
      } else {
        queueEdit({ kind: 'add-node', domain, title, summary: title, linkTo: from ?? undefined });
        setNote(t('graphEditorSchemeView.6'));
      }
    }
    setOwnTitle('');
    onChanged?.();
  }

  async function removeOwn(node: GraphNode) {
    if (!node.userConceptId) return;
    try {
      await deleteOwnNode(node.userConceptId);
      setSelected(null);
      onChanged?.();
    } catch {
      setNote(t('graphEditorSchemeView.7'));
    }
  }

  async function renameOwn(node: GraphNode, title: string) {
    if (!node.userConceptId || !title.trim()) return;
    try {
      await patchUserNode(node.userConceptId, { title: title.trim() });
      setNote(t('graphEditorSchemeView.8'));
      onChanged?.();
    } catch {
      setNote(t('graphEditorSchemeView.9'));
    }
  }

  const filtering = isFiltering(filters);
  const selectedNode = selected ? (byId.get(selected) ?? null) : null;

  const flag = (key: keyof Omit<Filters, 'query'>, text: string) => (
    <Chip
      key={key}
      text={text}
      selected={filters[key]}
      onPress={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
    />
  );

  return (
    <View style={{ gap: space.md }}>
      <SchemeLegend
        items={scene.legend}
        open={legendOpen}
        onToggle={() => {
          rememberFlag('graph-legend-open', !legendOpen);
          setLegendOpen(!legendOpen);
        }}
        title={mode === 'tree' ? t('graphEditorSchemeView.10') : t('graphEditorSchemeView.11')}
      />

      {domain && (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Field
            value={ownTitle}
            onChangeText={setOwnTitle}
            placeholder={selected ? t('graphEditorSchemeView.12') : t('graphEditorSchemeView.13')}
            style={{ flex: 1 }}
          />
          <Button
            label={t('graphEditorSchemeView.14')}
            variant="quiet"
            onPress={() => void addOwn()}
          />
        </View>
      )}
      {note && <Muted>{note}</Muted>}

      <Field
        value={filters.query}
        onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
        placeholder={t('graphEditorSchemeView.15')}
        accessibilityLabel={t('graphEditorSchemeView.16')}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
        {flag('studyNow', t('graphEditorSchemeView.17'))}
        {flag('hideKnown', t('graphEditorSchemeView.18'))}
        {flag('optionalOnly', t('graphEditorSchemeView.19'))}
        {flag('mineOnly', t('graphEditorSchemeView.20'))}
        {filtering && (
          <Pressable
            onPress={() => setFilters(NO_FILTERS)}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Muted>{t('graphEditorSchemeView.21')}</Muted>
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
        <Button
          label={t('graphEditorSchemeView.22')}
          variant="quiet"
          onPress={() => setFullscreen(true)}
        />
        <Muted>{t('graphEditorSchemeView.23')}</Muted>
      </View>

      <StageControls scene={scene} selected={selected} stageTitle={stageTitle} />

      <SchemeCanvas
        graph={scene.graph}
        layout={scene.layout}
        states={scene.states}
        estimates={estimates}
        highlight={scene.highlight}
        selected={selected}
        filters={filters}
        filtering={filtering}
        zoom={zoom}
        collapsed={collapsed}
        onSelect={scene.select}
        onToggleStage={scene.toggleStage}
        ports={scene.ports}
        height={420}
      >
        {scene.layer(zoom)}
      </SchemeCanvas>

      {scene.link && (
        <StageLinksCard
          link={scene.link}
          byId={byId}
          stageTitle={stageTitle}
          onPick={(id) => {
            scene.closeLink();
            scene.select(id);
          }}
          onClose={scene.closeLink}
        />
      )}

      <SchemeFullscreen
        visible={fullscreen}
        onClose={() => setFullscreen(false)}
        title={fullscreenTitle}
        graph={graph}
        scene={scene}
        states={states}
        estimates={estimates}
        selected={selected}
        filters={filters}
        onFilters={setFilters}
        byId={byId}
        onStudy={
          onStudy
            ? (id) => {
                setFullscreen(false);
                onStudy(id);
              }
            : undefined
        }
        studyLabel={studyLabel}
        onRemove={(n) => void removeOwn(n)}
        onRename={(n, t) => void renameOwn(n, t)}
      />

      {selectedNode && (
        <NodeCard
          node={selectedNode}
          state={states[selectedNode.id]}
          graph={graph}
          byId={byId}
          onClose={() => setSelected(null)}
          onPick={scene.select}
          onStudy={onStudy ? () => onStudy(selectedNode.id) : undefined}
          studyLabel={
            states[selectedNode.id] === 'learning' ? t('graphEditorSchemeView.24') : studyLabel
          }
          onRemove={
            selectedNode.kind === 'personal' ? () => void removeOwn(selectedNode) : undefined
          }
          onRename={
            selectedNode.kind === 'personal'
              ? (title) => void renameOwn(selectedNode, title)
              : undefined
          }
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
  studyLabel,
  onRemove,
  onRename,
}: {
  node: GraphNode;
  onRemove?: () => void;
  onRename?: (title: string) => void;
  state: MasteryState | undefined;
  graph: Graph;
  byId: Map<string, GraphNode>;
  onClose: () => void;
  onPick: (id: string) => void;
  onStudy?: () => void;
  studyLabel: string;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [title, setTitle] = useState(node.title);
  const before = graph.edges.filter((e) => e.to === node.id && e.type === 'prereq');
  const after = graph.edges.filter((e) => e.from === node.id && e.type === 'prereq');
  const link = (id: string) => {
    const n = byId.get(id);
    return n ? (
      <Pressable
        key={id}
        onPress={() => onPick(id)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
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
      <Body>{node.content.summary ?? t('graphEditorSchemeView.25')}</Body>
      {before.length > 0 && (
        <View style={{ gap: space.xs }}>
          <Muted>{t('graphEditorSchemeView.26')}</Muted>
          {before.map((e) => link(e.from))}
        </View>
      )}
      {after.length > 0 && (
        <View style={{ gap: space.xs }}>
          <Muted>{t('graphEditorSchemeView.27')}</Muted>
          {after.map((e) => link(e.to))}
        </View>
      )}
      {onStudy && state !== 'locked' && state !== 'known' && (
        <Button label={studyLabel} onPress={onStudy} />
      )}
      {onRename && (
        <View style={{ gap: space.sm }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('graphEditorSchemeView.28')}
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
          <Button
            label={t('graphEditorSchemeView.29')}
            variant="quiet"
            disabled={!title.trim() || title.trim() === node.title}
            onPress={() => onRename(title)}
          />
        </View>
      )}
      {onRemove && (
        <Button label={t('graphEditorSchemeView.30')} variant="danger" onPress={onRemove} />
      )}
      <Button label={t('graphEditorSchemeView.31')} variant="quiet" onPress={onClose} />
    </Card>
  );
}
