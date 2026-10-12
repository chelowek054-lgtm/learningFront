// Холст схемы пути: заголовки этапов, рёбра ломаными, узлы. Один компонент на встроенную схему и на полноэкранный режим
// (T-0132, T-0134): оба рисуют одинаково, различаются размером окна и тем, что подсвечено.
// Без новых зависимостей: узлы и рёбра — View, прокрутка — ScrollView, масштаб — transform.
import { useRef, type ReactNode, type RefObject } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import type { Graph, GraphEdge, GraphNode } from '@/shared/api';
import { radius, space, useTheme } from '@/shared/ui';
import {
  dashBars,
  jitterOf,
  laneYs,
  lookOf,
  matches,
  NODE_H,
  NODE_W,
  routeEdge,
  scaleOf,
  tagsOf,
  type Filters,
  type Highlight,
  type MasteryState,
  type SchemeLayout,
} from '../model/scheme';
import { isGhost } from '../model/overview';

/** Короткие подписи для плашки и чипов: подробное объяснение остаётся в подписи узла для читалок экрана. */
export const STATE_SHORT: Record<MasteryState, string> = {
  known: 'освоено',
  learning: 'изучаю',
  frontier: 'можно изучать',
  locked: 'закрыто',
};

export const STATE_TEXT: Record<MasteryState, string> = {
  known: 'освоено',
  learning: 'изучаю сейчас',
  frontier: 'можно изучать сейчас',
  locked: 'закрыто: сначала предпосылки',
};

/** `all` — весь граф, лишнее приглушено; `focus` — только выбранное и его связи. */
export type CanvasMode = 'all' | 'focus';

// userSelect есть у веба, но не в типах ViewStyle: добавляем отдельным объектом, чтобы не ломать tsc.
const WEB_NO_SELECT = { userSelect: 'none' };

const PAD = space.lg;

export function SchemeCanvas({
  graph,
  layout,
  states,
  estimates,
  highlight,
  selected,
  filters,
  filtering,
  zoom,
  mode = 'all',
  collapsed,
  onSelect,
  onToggleStage,
  height,
  onViewport,
  outerRef,
  innerRef,
  ports,
  children,
  onPinch,
  onScroll,
}: {
  graph: Graph;
  layout: SchemeLayout;
  states: Record<string, MasteryState>;
  estimates: Record<string, number>;
  highlight: Highlight | null;
  selected: string | null;
  filters: Filters;
  filtering: boolean;
  zoom: number;
  mode?: CanvasMode;
  collapsed: ReadonlySet<string>;
  onSelect: (id: string | null) => void;
  onToggleStage: (key: string) => void;
  /** Фиксированная высота окна; без неё холст занимает всё место, которое ему дали. */
  height?: number;
  onViewport?: (size: { width: number; height: number }) => void;
  outerRef?: RefObject<ScrollView | null>;
  innerRef?: RefObject<ScrollView | null>;
  /** Метки портов у понятий раскрытого этапа: «← 2 · 3 →» (T-0143). */
  ports?: Record<string, string>;
  /** Слой поверх узлов и рёбер в координатах схемы: блоки этапов, стрелки-счётчики (T-0142). */
  children?: ReactNode;
  /** Щипок двумя пальцами: во сколько раз изменить масштаб (T-0145). */
  onPinch?: (factor: number) => void;
  /** Куда прокручен холст, в пикселях окна: нужно мини-карте (T-0147). */
  onScroll?: (offset: { x: number; y: number }) => void;
}) {
  const { colors } = useTheme();
  const lanes = laneYs(layout);
  const offset = useRef({ x: 0, y: 0 });
  const pinch = useRef<number | null>(null);
  const touchDistance = (e: GestureResponderEvent): number | null => {
    const t = e.nativeEvent.touches;
    if (!t || t.length < 2) return null;
    return Math.hypot(t[0]!.pageX - t[1]!.pageX, t[0]!.pageY - t[1]!.pageY);
  };
  const pinchHandlers = onPinch
    ? {
        onTouchStart: (e: GestureResponderEvent) => {
          pinch.current = touchDistance(e);
        },
        onTouchMove: (e: GestureResponderEvent) => {
          const d = touchDistance(e);
          if (d === null) {
            pinch.current = null;
            return;
          }
          if (pinch.current !== null && pinch.current > 0) onPinch(d / pinch.current);
          pinch.current = d;
        },
        onTouchEnd: () => {
          pinch.current = null;
        },
      }
    : {};
  const report = (axis: 'x' | 'y', value: number) => {
    offset.current[axis] = value;
    onScroll?.({ ...offset.current });
  };
  const focus = mode === 'focus' && highlight !== null;
  const visibleNode = (id: string) => !focus || highlight!.nodes.has(id);

  // Подсвеченные рёбра рисуются последними, чтобы лежать поверх бледных.
  const edgeKind = (e: GraphEdge): 'before' | 'after' | 'dim' | 'plain' =>
    !highlight
      ? 'plain'
      : highlight.beforeEdges.has(e.id)
        ? 'before'
        : highlight.afterEdges.has(e.id)
          ? 'after'
          : 'dim';
  const edges = graph.edges
    .map((e) => ({ e, kind: edgeKind(e) }))
    .filter(({ e, kind }) => !(focus && kind === 'dim') && visibleNode(e.from) && visibleNode(e.to))
    .sort(
      (x, y) =>
        Number(x.kind === 'before' || x.kind === 'after') -
        Number(y.kind === 'before' || y.kind === 'after'),
    );

  const width = (layout.width + PAD * 2) * zoom;
  const heightPx = (layout.height + PAD * 2) * zoom;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => onViewport?.(e.nativeEvent.layout)}
      {...pinchHandlers}
      style={{
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        overflow: 'hidden',
        // Выделение текста при перетаскивании холста мешает: узлы — кнопки, а не текст.
        ...(WEB_NO_SELECT as object),
        ...(height ? { height } : { flex: 1 }),
      }}
    >
      <ScrollView
        horizontal
        nestedScrollEnabled
        ref={outerRef}
        scrollEventThrottle={32}
        onScroll={(e) => report('x', e.nativeEvent.contentOffset.x)}
      >
        <ScrollView
          nestedScrollEnabled
          ref={innerRef}
          scrollEventThrottle={32}
          onScroll={(e) => report('y', e.nativeEvent.contentOffset.y)}
        >
          <View style={{ width, height: heightPx }}>
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: layout.width + PAD * 2,
                height: layout.height + PAD * 2,
                padding: PAD,
                transform: [{ scale: zoom }],
                transformOrigin: 'top left',
              }}
            >
              <View style={{ position: 'absolute', left: PAD, top: PAD }}>
                {layout.columns.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => onToggleStage(c.key)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !collapsed.has(c.key) }}
                    accessibilityLabel={`Этап ${c.title}${c.area ? `, ${c.area}` : ''}`}
                    style={{
                      position: 'absolute',
                      left: c.x,
                      top: 0,
                      // Зона нажатия заголовка — не меньше 44 px при любом масштабе.
                      minHeight: Math.ceil(44 / zoom),
                      width: collapsed.has(c.key) ? 56 : NODE_W,
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{ color: colors.ink, fontWeight: '700', fontSize: 13, lineHeight: 16 }}
                    >
                      {collapsed.has(c.key) ? '▸ ' : ''}
                      {c.title} · {c.count}
                    </Text>
                    {c.area && !collapsed.has(c.key) ? (
                      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>
                        {c.area}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}

                {edges.map(({ e, kind }) => {
                  const a = layout.positions[e.from];
                  const b = layout.positions[e.to];
                  if (!a || !b) return null;
                  const mine = e.kind === 'personal';
                  const on = kind === 'before' || kind === 'after';
                  const color =
                    kind === 'before'
                      ? colors.info
                      : kind === 'after'
                        ? colors.ok
                        : mine
                          ? colors.core
                          : colors.muted;
                  const t = on ? 3 : mine ? 2.5 : 1.5;
                  const route = routeEdge(a, b, lanes, jitterOf(e.id), t);
                  const opacity = kind === 'dim' ? 0.12 : on ? 1 : mine ? 0.9 : 0.5;
                  const arrow = route.arrow;
                  return (
                    <View
                      key={e.id}
                      pointerEvents="none"
                      style={{ position: 'absolute', left: 0, top: 0, opacity }}
                    >
                      {(mine ? dashBars(route.bars) : route.bars).map((bar, i) => (
                        <View
                          key={i}
                          style={{ position: 'absolute', ...bar, backgroundColor: color }}
                        />
                      ))}
                      <View
                        style={{
                          position: 'absolute',
                          left: arrow.dir === 'right' ? arrow.x - 7 : arrow.x,
                          top: arrow.y - 4.5,
                          width: 0,
                          height: 0,
                          borderTopWidth: 4.5,
                          borderBottomWidth: 4.5,
                          borderTopColor: 'transparent',
                          borderBottomColor: 'transparent',
                          ...(arrow.dir === 'right'
                            ? { borderLeftWidth: 7, borderLeftColor: color }
                            : { borderRightWidth: 7, borderRightColor: color }),
                        }}
                      />
                    </View>
                  );
                })}

                {graph.nodes.map((n) => {
                  const p = layout.positions[n.id];
                  if (!p || !visibleNode(n.id)) return null;
                  return (
                    <NodeBox
                      key={n.id}
                      node={n}
                      x={p.x}
                      y={p.y}
                      state={states[n.id]}
                      estimate={estimates[n.id]}
                      isSelected={n.id === selected}
                      inPath={highlight?.nodes.has(n.id) ?? true}
                      hit={!filtering || matches(n, filters, states)}
                      port={ports?.[n.id]}
                      ghost={isGhost(n.id)}
                      onPress={() => onSelect(n.id === selected ? null : n.id)}
                    />
                  );
                })}
                {children}
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function NodeBox({
  node: n,
  x,
  y,
  state,
  estimate,
  isSelected,
  inPath,
  hit,
  port,
  ghost,
  onPress,
}: {
  node: GraphNode;
  x: number;
  y: number;
  state: MasteryState | undefined;
  estimate: number | undefined;
  isSelected: boolean;
  inPath: boolean;
  hit: boolean;
  /** Метка порта: сколько связей уходит в другие этапы. */
  port?: string;
  /** Призрак: сосед выбранного из свёрнутого этапа. */
  ghost?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const look = lookOf(n, state);
  const border = isSelected
    ? colors.focus
    : look.emphasis === 'frontier'
      ? colors.accent
      : look.emphasis === 'learning'
        ? colors.core
        : colors.line;
  const dot = 6 + (scaleOf(n) - 1) * 30;
  const tags = tagsOf(n);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${n.title}${state ? `, ${STATE_TEXT[state]}` : ''}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        paddingHorizontal: space.sm,
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: n.kind === 'personal' ? NODE_H / 2 : radius.md,
        borderWidth: isSelected
          ? 3
          : look.emphasis === 'frontier' || look.emphasis === 'learning'
            ? 2.5
            : 1,
        borderStyle: look.dashed ? 'dashed' : 'solid',
        borderColor: border,
        backgroundColor: state === 'locked' ? colors.surfaceAlt : colors.surface,
        opacity: Math.min(look.opacity, hit ? 1 : 0.15, inPath ? 1 : 0.22, ghost ? 0.7 : 1),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot,
            backgroundColor: state === 'known' ? colors.core : colors.accent,
          }}
        />
        <Text
          numberOfLines={2}
          style={{ flex: 1, color: colors.ink, fontSize: 13, lineHeight: 15, fontWeight: '600' }}
        >
          {state === 'locked' ? '🔒 ' : ''}
          {n.title}
        </Text>
      </View>
      {/* Метки на самом узле: уровень, необязательное, не проверено, своё, «сейчас». */}
      {tags.length > 0 || state === 'learning' || port ? (
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10 }}>
          {[...(port ? [port] : []), ...(state === 'learning' ? ['сейчас'] : []), ...tags].join(
            ' · ',
          )}
        </Text>
      ) : null}
      {state === 'learning' && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 4,
            width: `${Math.max(8, Math.round((estimate ?? 0) * 100))}%`,
            backgroundColor: colors.core,
          }}
        />
      )}
    </Pressable>
  );
}
