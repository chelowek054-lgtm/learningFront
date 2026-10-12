// Легенда схемы (T-0114, T-0135…T-0137): образцы нарисованы теми же приёмами, что узлы и линии на холсте;
// строки и числа даёт model/legend.ts, поэтому легенда не расходится с рисунком. Сворачивается, выбор запоминается.
import { Pressable, Text, View } from 'react-native';
import { Card, font, Label, Muted, radius, space, useTheme } from '@/shared/ui';
import { dashBars, type Bar } from '../model/scheme';
import type { LegendItem, LegendSample } from '../model/legend';
import { translate, useI18n } from '@/shared/i18n';

const SAMPLE_W = 40;

export function SchemeLegend({
  items,
  open,
  onToggle,
  title = translate('graphEditorSchemeLegend.1'),
}: {
  items: LegendItem[];
  open: boolean;
  onToggle: () => void;
  title?: string;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Label>{open ? `▾ ${title}` : `▸ ${title}`}</Label>
      </Pressable>
      {open && <LegendList items={items} />}
    </Card>
  );
}

/** Список строк без рамки: во весь экран он лежит в панели, во встроенной схеме — в карточке. */
export function LegendList({ items }: { items: LegendItem[] }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.sm }}>
      {items.map((i) => (
        <View
          key={i.id}
          accessible
          accessibilityLabel={
            i.count ? t('graphEditorSchemeLegend.2', { text: i.text, count: i.count }) : i.text
          }
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        >
          <View style={{ width: SAMPLE_W, alignItems: 'center' }}>
            <Sample sample={i.sample} />
          </View>
          <View style={{ flex: 1 }}>
            <Muted>
              {i.text}
              {i.count ? ` · ${i.count}` : ''}
            </Muted>
          </View>
        </View>
      ))}
    </View>
  );
}

function Sample({ sample }: { sample: LegendSample }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  switch (sample.kind) {
    case 'node': {
      const look = sample.look;
      const border =
        look === 'frontier' ? colors.accent : look === 'learning' ? colors.core : colors.line;
      return (
        <View
          style={{
            width: 30,
            height: 18,
            overflow: 'hidden',
            borderRadius: look === 'own' ? 9 : radius.sm,
            borderWidth: look === 'frontier' || look === 'learning' ? 2.5 : 1,
            borderStyle: look === 'optional' ? 'dashed' : 'solid',
            borderColor: border,
            backgroundColor: look === 'locked' ? colors.surfaceAlt : colors.surface,
            opacity: look === 'known' ? 0.42 : look === 'locked' ? 0.7 : 1,
            justifyContent: 'flex-end',
          }}
        >
          {look === 'learning' && (
            <View style={{ height: 3, width: '55%', backgroundColor: colors.core }} />
          )}
        </View>
      );
    }
    case 'size':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <View
            style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }}
          />
        </View>
      );
    case 'edge': {
      const color =
        sample.tone === 'before'
          ? colors.info
          : sample.tone === 'after'
            ? colors.ok
            : sample.tone === 'own'
              ? colors.core
              : colors.muted;
      const thick = sample.tone === 'before' || sample.tone === 'after' ? 3 : 2;
      const line: Bar = { left: 0, top: 0, width: 31, height: thick };
      const bars = sample.dashed ? dashBars([line], 6, 4) : [line];
      return (
        <View style={{ width: SAMPLE_W, height: 10, justifyContent: 'center' }}>
          <View style={{ height: thick }}>
            {bars.map((b, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: b.left,
                  width: b.width,
                  height: b.height,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
          <View
            style={{
              position: 'absolute',
              right: 0,
              width: 0,
              height: 0,
              borderTopWidth: 4.5,
              borderBottomWidth: 4.5,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftWidth: 7,
              borderLeftColor: color,
            }}
          />
        </View>
      );
    }
    case 'label':
      return (
        <Text style={{ color: colors.muted, fontSize: 10 }}>{t('graphEditorSchemeLegend.3')}</Text>
      );
    case 'stage':
      return (
        <View
          style={{
            width: 34,
            height: 20,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            justifyContent: 'flex-end',
          }}
        >
          <View style={{ height: 3, width: '60%', backgroundColor: colors.core }} />
        </View>
      );
    case 'count':
      return (
        <View
          style={{
            minWidth: 22,
            height: 18,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.ink, fontSize: font.caption, fontWeight: '600' }}>3</Text>
        </View>
      );
    case 'ghost':
      return (
        <View
          style={{
            width: 30,
            height: 18,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.muted,
            opacity: 0.65,
          }}
        />
      );
  }
}
