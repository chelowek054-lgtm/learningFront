// Схема пути во весь экран (T-0132, R-0068): слой поверх экрана с крупным холстом, масштабом и «Вписать»,
// плашкой выбранного понятия (снизу на телефоне, сбоку на планшете и десктопе) и подсветкой только его связей.
// Закрывается кнопкой и Esc; выбранный узел остаётся выбранным и после выхода.
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
import { Field, font, navLayoutFor, radius, SegmentedControl, space, useTheme } from '@/shared/ui';
import {
  isFiltering,
  matches,
  NODE_H,
  NODE_W,
  fitZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  type Filters,
  type Highlight,
  type MasteryState,
  type SchemeLayout,
} from '../model/scheme';
import { NodePlate } from './node-plate';
import { SchemeCanvas, type CanvasMode } from './scheme-canvas';

/** Нижняя граница масштаба при открытии: текст узлов остаётся читаемым. */
const OPEN_ZOOM_MIN = 0.75;

const MODES: readonly { value: CanvasMode; label: string }[] = [
  { value: 'all', label: 'Весь граф' },
  { value: 'focus', label: 'Только связи' },
];

export function SchemeFullscreen({
  visible,
  onClose,
  title,
  graph,
  layout,
  states,
  estimates,
  highlight,
  selected,
  onSelect,
  filters,
  onFilters,
  collapsed,
  onToggleStage,
  byId,
  onStudy,
  studyLabel,
  onRemove,
  onRename,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  graph: Graph;
  layout: SchemeLayout;
  states: Record<string, MasteryState>;
  estimates: Record<string, number>;
  highlight: Highlight | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  collapsed: ReadonlySet<string>;
  onToggleStage: (key: string) => void;
  byId: Map<string, GraphNode>;
  onStudy?: () => void;
  studyLabel: string;
  onRemove?: (node: GraphNode) => void;
  onRename?: (node: GraphNode, title: string) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  // Боковая плашка — от планшета (md), на телефоне — нижняя панель.
  const wide = navLayoutFor(width) !== 'bottom';
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<CanvasMode>('all');
  const [expanded, setExpanded] = useState(false);
  const [searching, setSearching] = useState(false);
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

  // Клавиатура (веб): Esc — закрыть, F — вписать, «+» и «−» — масштаб.
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
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(ZOOM_MAX, z * 1.25));
      else if (e.key === '-') setZoom((z) => Math.max(ZOOM_MIN, z / 1.25));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, onClose, fit]);

  const filtering = isFiltering(filters);
  const node = selected ? (byId.get(selected) ?? null) : null;
  const matched = useMemo(
    () =>
      filtering
        ? graph.nodes.filter((n) => matches(n, filters, states)).length
        : graph.nodes.length,
    [filtering, graph.nodes, filters, states],
  );

  const plate = node ? (
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
      onStudy={onStudy}
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
          style={{ flex: 1, flexDirection: wide ? 'row' : 'column', gap: space.sm, minHeight: 0 }}
        >
          <View style={{ flex: 1, minHeight: 160, minWidth: 0 }}>
            <SchemeCanvas
              graph={graph}
              layout={layout}
              states={states}
              estimates={estimates}
              highlight={highlight}
              selected={selected}
              filters={filters}
              filtering={filtering}
              zoom={zoom}
              mode={mode}
              collapsed={collapsed}
              onSelect={onSelect}
              onToggleStage={onToggleStage}
              onViewport={setViewport}
              outerRef={outerRef}
              innerRef={innerRef}
            />
            <View
              style={{
                position: 'absolute',
                right: space.sm,
                bottom: space.sm,
                gap: space.sm,
                alignItems: 'flex-end',
              }}
            >
              {ctl(
                '+',
                'Приблизить',
                () => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25)),
                zoom >= ZOOM_MAX,
              )}
              {ctl(
                '−',
                'Отдалить',
                () => setZoom((z) => Math.max(ZOOM_MIN, z / 1.25)),
                zoom <= ZOOM_MIN,
              )}
              {ctl('Вписать', 'Вписать схему в экран', fit)}
            </View>
            {!node && (
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
                  Esc — закрыть · F — вписать · «+» и «−» — масштаб
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
