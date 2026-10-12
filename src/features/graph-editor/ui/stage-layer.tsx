// Слой обзора по этапам поверх холста схемы (R-0070, T-0142, T-0143): блоки свёрнутых этапов, заголовки раскрытых,
// стрелки-счётчики между этапами и плашка «ещё N» у призраков. Лежит в координатах схемы, как узлы и рёбра.
import { Pressable, Text, View } from 'react-native';
import { radius, useTheme } from '@/shared/ui';
import type { Overview, StageArrow, StageBox, StageLink } from '../model/overview';
import { NODE_W } from '../model/scheme';
import { useI18n } from '@/shared/i18n';

export function StageLayer({
  overview,
  zoom,
  onToggleStage,
  onOpenLink,
  onExpandStage,
}: {
  overview: Overview;
  zoom: number;
  onToggleStage: (key: string) => void;
  onOpenLink: (link: StageLink) => void;
  onExpandStage: (key: string) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const selecting = overview.highlight !== null;
  return (
    <>
      {overview.arrows.map((a) => (
        <Arrow key={a.link.id} arrow={a} zoom={zoom} onPress={() => onOpenLink(a.link)} />
      ))}
      {overview.boxes.map((b) => (
        <Block
          key={b.key}
          box={b}
          dim={selecting && !b.expanded}
          onPress={() => onToggleStage(b.key)}
        />
      ))}
      {overview.more.map((m) => (
        <Pressable
          key={m.key}
          onPress={() => onExpandStage(m.key)}
          accessibilityRole="button"
          accessibilityLabel={t('graphEditorStageLayer.1', { count: m.count })}
          style={{
            position: 'absolute',
            left: m.x,
            top: m.y,
            width: NODE_W,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.muted,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '600' }}>
            {t('graphEditorStageLayer.2', { count: m.count })}
          </Text>
        </Pressable>
      ))}
    </>
  );
}

/** Блок свёрнутого этапа или заголовок раскрытого: название, область, «освоено k из n», полоса; нажатие переключает. */
function Block({ box, dim, onPress }: { box: StageBox; dim: boolean; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const share = box.count ? box.known / box.count : 0;
  const header = box.expanded;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: box.expanded }}
      accessibilityLabel={t('m.blockA11y', {
        title: box.title,
        area: box.area ? `, ${box.area}` : '',
        known: box.known,
        count: box.count,
        action: box.expanded ? t('graphEditorStageLayer.3') : t('graphEditorStageLayer.4'),
      })}
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: header ? 54 : box.h,
        paddingHorizontal: 10,
        paddingTop: 8,
        borderRadius: radius.md,
        borderWidth: header ? 0 : 1,
        borderColor: colors.line,
        backgroundColor: header ? 'transparent' : colors.surface,
        opacity: dim ? 0.6 : 1,
        overflow: 'hidden',
      }}
    >
      <Text
        numberOfLines={2}
        style={{ color: colors.ink, fontWeight: '700', fontSize: 13, lineHeight: 16 }}
      >
        {header ? '▾ ' : '▸ '}
        {box.title}
      </Text>
      {box.area ? (
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>
          {box.area}
        </Text>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
        {t('graphEditorStageLayer.5', { known: box.known, count: box.count })}
      </Text>
      {!header && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 4,
            width: `${Math.max(share > 0 ? 6 : 0, Math.round(share * 100))}%`,
            backgroundColor: colors.core,
          }}
        />
      )}
    </Pressable>
  );
}

/** Ломаная между блоками со стрелкой и счётчиком; счётчик нажимается и открывает список связей. */
function Arrow({ arrow, zoom, onPress }: { arrow: StageArrow; zoom: number; onPress: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const a = arrow.arrow;
  const n = arrow.link.edges.length;
  // Зона нажатия счётчика не меньше 44 px при любом масштабе.
  const size = Math.max(24, Math.ceil(44 / zoom));
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: 0.8 }}>
        {arrow.bars.map((bar, i) => (
          <View key={i} style={{ position: 'absolute', ...bar, backgroundColor: colors.muted }} />
        ))}
        <View
          style={{
            position: 'absolute',
            left: a.dir === 'right' ? a.x - 7 : a.x,
            top: a.y - 4.5,
            width: 0,
            height: 0,
            borderTopWidth: 4.5,
            borderBottomWidth: 4.5,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            ...(a.dir === 'right'
              ? { borderLeftWidth: 7, borderLeftColor: colors.muted }
              : { borderRightWidth: 7, borderRightColor: colors.muted }),
          }}
        />
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('m.arrowA11y', { count: n })}
        style={{
          position: 'absolute',
          left: arrow.pill.x - size / 2,
          top: arrow.pill.y - size / 2,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            minWidth: 24,
            height: 20,
            paddingHorizontal: 6,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '700' }}>{n}</Text>
        </View>
      </Pressable>
    </>
  );
}
