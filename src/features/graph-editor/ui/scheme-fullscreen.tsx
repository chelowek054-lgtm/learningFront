// Схема пути во весь экран (T-0132, R-0068): слой поверх экрана с крупным холстом, масштабом и «Вписать»,
// плашкой выбранного понятия (снизу на телефоне, сбоку на планшете и десктопе) и подсветкой только его связей.
// Закрывается кнопкой и Esc; выбранный узел остаётся выбранным и после выхода.
// Дальше (T-0136, T-0144…T-0147): легенда, фильтры нижней панелью, мини-карта, щипок, стрелки клавиатуры.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Graph, GraphNode } from '@/shared/api';
import {
  Button,
  Card,
  Chip,
  Field,
  font,
  navLayoutFor,
  radius,
  SegmentedControl,
  space,
  useTheme,
} from '@/shared/ui';
import { neighborByKey, type KeyDirection } from '../model/keys';
import {
  isFiltering,
  matches,
  NODE_H,
  NODE_W,
  fitZoom,
  NO_FILTERS,
  ZOOM_MAX,
  ZOOM_MIN,
  type Filters,
  type MasteryState,
} from '../model/scheme';
import { stageTitleOf } from '../model/overview';
import { MiniMap } from './mini-map';
import { NodePlate } from './node-plate';
import { LegendList } from './scheme-legend';
import { SchemeCanvas, type CanvasMode } from './scheme-canvas';
import { StageControls, StageLinksCard } from './stage-controls';
import type { SchemeScene } from './use-scheme-scene';

/** Нижняя граница масштаба при открытии: текст узлов остаётся читаемым. */
const OPEN_ZOOM_MIN = 0.75;

const MODES: readonly { value: CanvasMode; label: string }[] = [
  { value: 'all', label: 'Весь граф' },
  { value: 'focus', label: 'Только связи' },
];

const FILTER_FLAGS: readonly { key: keyof Omit<Filters, 'query'>; text: string }[] = [
  { key: 'studyNow', text: 'можно изучать сейчас' },
  { key: 'hideKnown', text: 'скрыть пройденное' },
  { key: 'optionalOnly', text: 'только необязательное' },
  { key: 'mineOnly', text: 'только своё' },
];

const ARROW_KEYS: Record<string, KeyDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

type Panel = 'none' | 'legend' | 'filters';

export function SchemeFullscreen({
  visible,
  onClose,
  title,
  graph,
  scene,
  states,
  estimates,
  selected,
  filters,
  onFilters,
  byId,
  onStudy,
  studyLabel,
  onRemove,
  onRename,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Исходный граф: плашка понятия берёт из него всех соседей, даже скрытых обзором. */
  graph: Graph;
  /** Что рисует холст: обычная раскладка или обзор по этапам, подсветка, слой блоков, легенда. */
  scene: SchemeScene;
  states: Record<string, MasteryState>;
  estimates: Record<string, number>;
  selected: string | null;
  filters: Filters;
  onFilters: (f: Filters) => void;
  byId: Map<string, GraphNode>;
  onStudy?: (conceptId?: string) => void;
  studyLabel: string;
  onRemove?: (node: GraphNode) => void;
  onRename?: (node: GraphNode, title: string) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  // Боковая плашка — от планшета (md), на телефоне — нижняя панель.
  const wide = navLayoutFor(width) !== 'bottom';
  const layout = scene.layout;
  const onSelect = scene.select;
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<CanvasMode>('all');
  const [expanded, setExpanded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [showMap, setShowMap] = useState(wide);
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const outerRef = useRef<ScrollView>(null);
  const innerRef = useRef<ScrollView>(null);

  const fit = useCallback(() => {
    if (viewport) setZoom(fitZoom(layout, viewport));
  }, [layout, viewport]);

  // При открытии вписываем схему в экран.
  const opened = useRef(false);
  useEffect(() => {
    if (!visible) {
      opened.current = false;
      return;
    }
    if (viewport && !opened.current) {
      opened.current = true;
      // При открытии берём читаемый масштаб, а не «всё целиком»: на телефоне целиком — мелкие буквы.
      // «Вписать» остаётся отдельной кнопкой.
      setZoom(Math.min(1, Math.max(fitZoom(layout, viewport), OPEN_ZOOM_MIN)));
    }
  }, [visible, viewport, layout]);

  // Выбор нового узла сдвигает холст так, чтобы узел оказался в середине окна (плашка не перекрывает).
  useEffect(() => {
    if (!visible || !selected || !viewport) return;
    const p = layout.positions[selected];
    if (!p) return;
    const pad = space.lg;
    const x = (p.x + pad + NODE_W / 2) * zoom - viewport.width / 2;
    const y = (p.y + pad + NODE_H / 2) * zoom - viewport.height / 2;
    outerRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    innerRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    // Только по смене выбора: масштаб и размер окна двигать холст не должны.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, visible]);

  const zoomBy = useCallback(
    (factor: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor))),
    [],
  );

  // Клавиатура (веб): Esc — закрыть, F — вписать, «+» и «−» — масштаб, стрелки — по соседям (T-0144).
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') (el as HTMLInputElement).blur();
        return;
      }
      if (e.key === 'Escape') onClose();
      else if (e.key === 'f' || e.key === 'F') fit();
      else if (e.key === '+' || e.key === '=') zoomBy(1.25);
      else if (e.key === '-') zoomBy(1 / 1.25);
      else if (ARROW_KEYS[e.key]) {
        e.preventDefault();
        const next = neighborByKey(ARROW_KEYS[e.key]!, selected, scene.graph.edges, layout);
        if (next) onSelect(next);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, onClose, fit, zoomBy, selected, scene.graph.edges, layout, onSelect]);

  const filtering = isFiltering(filters);
  const node = selected ? (byId.get(selected) ?? null) : null;
  const matched = useMemo(
    () =>
      filtering
        ? graph.nodes.filter((n) => matches(n, filters, states)).length
        : graph.nodes.length,
    [filtering, graph.nodes, filters, states],
  );
  const stageTitle = useCallback((key: string) => stageTitleOf(graph.nodes, key), [graph.nodes]);

  const plate = scene.link ? (
    <View style={wide ? { width: 360, maxWidth: '40%', minWidth: 300 } : undefined}>
      <StageLinksCard
        link={scene.link}
        byId={byId}
        stageTitle={stageTitle}
        onPick={(id) => {
          scene.closeLink();
          onSelect(id);
        }}
        onClose={scene.closeLink}
      />
    </View>
  ) : node ? (
    <NodePlate
      key={node.id}
      node={node}
      state={states[node.id]}
      graph={graph}
      byId={byId}
      mode={wide ? 'side' : 'sheet'}
      expanded={wide || expanded}
      onToggleExpanded={() => setExpanded((v) => !v)}
      onClose={() => onSelect(null)}
      onPick={onSelect}
      onStudy={onStudy ? () => onStudy(node.id) : undefined}
      studyLabel={states[node.id] === 'learning' ? 'Продолжить' : studyLabel}
      onRemove={node.kind === 'personal' && onRemove ? () => onRemove(node) : undefined}
      onRename={node.kind === 'personal' && onRename ? (t) => onRename(node, t) : undefined}
      maxHeight={Math.round(windowHeight * 0.5)}
    />
  ) : null;

  const ctl = (label: string, a11y: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={disabled}
      onPress={onPress}
      style={{
        minWidth: 44,
        height: 44,
        paddingHorizontal: space.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: colors.ink, fontSize: font.body, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );

  const togglePanel = (next: Exclude<Panel, 'none'>) =>
    setPanel((p) => (p === next ? 'none' : next));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, space.md),
          paddingBottom: Math.max(insets.bottom, space.md),
          paddingHorizontal: space.md,
          gap: space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Закрыть схему"
            style={{
              minHeight: 44,
              minWidth: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.xs,
              paddingHorizontal: space.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: font.body }}>✕</Text>
            {wide && (
              <Text style={{ color: colors.ink, fontSize: font.body, fontWeight: '600' }}>
                Закрыть
              </Text>
            )}
            {wide && Platform.OS === 'web' && (
              <Text style={{ color: colors.muted, fontSize: font.caption }}>Esc</Text>
            )}
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: colors.ink, fontSize: font.body, fontWeight: '700' }}
            >
              Схема пути
            </Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: font.small }}>
              {title}
              {filtering ? ` · найдено ${matched}` : ''}
            </Text>
          </View>
          {wide && (
            <View style={{ width: 240 }}>
              <SegmentedControl options={MODES} value={mode} onChange={setMode} />
            </View>
          )}
          {ctl('⌕', 'Найти понятие', () => setSearching((v) => !v))}
        </View>

        {!wide && <SegmentedControl options={MODES} value={mode} onChange={setMode} />}
        {searching && (
          <Field
            autoFocus
            value={filters.query}
            onChangeText={(query) => onFilters({ ...filters, query })}
            placeholder="найти понятие"
            accessibilityLabel="Найти понятие"
          />
        )}
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' }}
        >
          <Chip
            size="sm"
            text="Легенда"
            selected={panel === 'legend'}
            onPress={() => togglePanel('legend')}
          />
          <Chip
            size="sm"
            text={filtering ? 'Фильтры ●' : 'Фильтры'}
            selected={panel === 'filters'}
            onPress={() => togglePanel('filters')}
          />
          <Chip
            size="sm"
            text="Мини-карта"
            selected={showMap}
            onPress={() => setShowMap((v) => !v)}
          />
        </View>
        <StageControls scene={scene} selected={selected} stageTitle={stageTitle} />

        <View
          style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: space.sm, minHeight: 0 }}
        >
          <View style={{ flex: 1, minHeight: 160, minWidth: 0 }}>
            <SchemeCanvas
              graph={scene.graph}
              layout={layout}
              states={scene.states}
              estimates={estimates}
              highlight={scene.highlight}
              selected={selected}
              filters={filters}
              filtering={filtering}
              zoom={zoom}
              mode={mode}
              collapsed={new Set()}
              onSelect={onSelect}
              onToggleStage={scene.toggleStage}
              onViewport={setViewport}
              outerRef={outerRef}
              innerRef={innerRef}
              ports={scene.ports}
              onPinch={zoomBy}
              onScroll={setScroll}
            >
              {scene.layer(zoom)}
            </SchemeCanvas>
            {showMap && viewport && (
              <View
                pointerEvents="box-none"
                style={{ position: 'absolute', left: space.sm, top: space.sm }}
              >
                <MiniMap
                  layout={layout}
                  boxes={scene.overview?.boxes}
                  selected={selected}
                  zoom={zoom}
                  viewport={viewport}
                  scroll={scroll}
                  onJump={(x, y) => {
                    outerRef.current?.scrollTo({ x, animated: true });
                    innerRef.current?.scrollTo({ y, animated: true });
                  }}
                />
              </View>
            )}
            <View
              style={{
                position: 'absolute',
                right: space.sm,
                bottom: space.sm,
                gap: space.sm,
                alignItems: 'flex-end',
              }}
            >
              {ctl('+', 'Приблизить', () => zoomBy(1.25), zoom >= ZOOM_MAX)}
              {ctl('−', 'Отдалить', () => zoomBy(1 / 1.25), zoom <= ZOOM_MIN)}
              {ctl('Вписать', 'Вписать схему в экран', fit)}
            </View>
            {panel !== 'none' && (
              <View
                style={{
                  position: 'absolute',
                  left: space.sm,
                  right: wide ? undefined : space.sm,
                  bottom: space.sm,
                  width: wide ? 340 : undefined,
                  maxHeight: '70%',
                }}
              >
                <Card>
                  <ScrollView contentContainerStyle={{ gap: space.sm }}>
                    {panel === 'legend' ? (
                      <LegendList items={scene.legend} />
                    ) : (
                      <View style={{ gap: space.sm }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                          {FILTER_FLAGS.map((f) => (
                            <Chip
                              key={f.key}
                              size="sm"
                              text={f.text}
                              selected={filters[f.key]}
                              onPress={() => onFilters({ ...filters, [f.key]: !filters[f.key] })}
                            />
                          ))}
                        </View>
                        {filtering && (
                          <Button
                            size="sm"
                            variant="quiet"
                            label="Сбросить"
                            onPress={() => onFilters(NO_FILTERS)}
                          />
                        )}
                      </View>
                    )}
                  </ScrollView>
                  <Button
                    size="sm"
                    variant="quiet"
                    label="Закрыть"
                    onPress={() => setPanel('none')}
                  />
                </Card>
              </View>
            )}
            {!node && panel === 'none' && (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: space.md, bottom: space.sm }}
              >
                <Text style={{ color: colors.muted, fontSize: font.caption }}>
                  Нажмите на понятие, чтобы увидеть его связи
                </Text>
              </View>
            )}
          </View>
          {plate}
          {!plate && wide && (
            <View style={{ width: 300, maxWidth: '40%' }}>
              <Text style={{ color: colors.muted, fontSize: font.small }}>
                Плашка понятия появится справа: описание, связи и действия. Остальной граф
                приглушится.
              </Text>
              {Platform.OS === 'web' && (
                <Text style={{ color: colors.muted, fontSize: font.caption, marginTop: space.sm }}>
                  Esc — закрыть · F — вписать · «+» и «−» — масштаб · стрелки — по соседям
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
