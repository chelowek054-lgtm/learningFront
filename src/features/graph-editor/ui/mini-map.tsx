// Мини-карта большого графа (T-0147): вся схема уменьшенной, рамка — то, что сейчас в окне; нажатие переносит окно.
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import { radius, useTheme } from '@/shared/ui';
import { NODE_H, NODE_W, type SchemeLayout } from '../model/scheme';
import type { StageBox } from '../model/overview';

const W = 168;
const H = 108;
const PAD = 16;

export function MiniMap({
  layout,
  boxes,
  selected,
  zoom,
  viewport,
  scroll,
  onJump,
}: {
  layout: SchemeLayout;
  /** Блоки этапов обзора: рисуются крупнее узлов. */
  boxes?: StageBox[];
  selected: string | null;
  zoom: number;
  viewport: { width: number; height: number };
  scroll: { x: number; y: number };
  /** Куда прокрутить холст, в пикселях окна: левый верхний угол. */
  onJump: (x: number, y: number) => void;
}) {
  const { colors } = useTheme();
  const contentW = layout.width + PAD * 2;
  const contentH = layout.height + PAD * 2;
  const k = Math.min(W / contentW, H / contentH);
  const frame = {
    left: (scroll.x / zoom) * k,
    top: (scroll.y / zoom) * k,
    width: Math.min(contentW * k, (viewport.width / zoom) * k),
    height: Math.min(contentH * k, (viewport.height / zoom) * k),
  };
  const jump = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    // Центр окна — в точку нажатия.
    onJump(
      Math.max(0, (locationX / k) * zoom - viewport.width / 2),
      Math.max(0, (locationY / k) * zoom - viewport.height / 2),
    );
  };
  return (
    <Pressable
      onPress={jump}
      accessibilityRole="button"
      accessibilityLabel="Мини-карта схемы: нажмите, чтобы перейти к месту"
      style={{
        width: contentW * k,
        height: contentH * k,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      {boxes?.map((b) => (
        <View
          key={b.key}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (b.x + PAD) * k,
            top: (b.y + PAD) * k,
            width: b.w * k,
            height: b.h * k,
            borderRadius: 2,
            backgroundColor: colors.line,
            opacity: b.expanded ? 0.35 : 0.8,
          }}
        />
      ))}
      {Object.entries(layout.positions).map(([id, p]) => (
        <View
          key={id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (p.x + PAD) * k,
            top: (p.y + PAD) * k,
            width: Math.max(2, NODE_W * k),
            height: Math.max(2, NODE_H * k),
            borderRadius: 1,
            backgroundColor: id === selected ? colors.focus : colors.muted,
          }}
        />
      ))}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          ...frame,
          borderWidth: 1.5,
          borderColor: colors.accent,
          backgroundColor: 'transparent',
        }}
      />
    </Pressable>
  );
}
