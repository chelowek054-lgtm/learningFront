// Плашка выбранного понятия в полноэкранной схеме (T-0133, R-0068): название, область и этап, уровень,
// освоение, пояснение, соседи «нужно раньше» и «открывает», «Изучать» и действия для своего понятия.
// На телефоне — нижняя панель с двумя положениями (компактная и раскрытая), на планшете и десктопе — боковая.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Graph, GraphNode } from '@/shared/api';
import { Body, Button, Card, Field, font, Muted, Pill, space, useTheme } from '@/shared/ui';
import { tagsOf, type MasteryState } from '../model/scheme';
import { STATE_SHORT } from './scheme-canvas';
import { useI18n } from '@/shared/i18n';

export type PlateMode = 'side' | 'sheet';

export function NodePlate({
  node,
  state,
  graph,
  byId,
  mode,
  expanded,
  onToggleExpanded,
  onClose,
  onPick,
  onStudy,
  studyLabel,
  onRemove,
  onRename,
  maxHeight,
}: {
  node: GraphNode;
  state: MasteryState | undefined;
  graph: Graph;
  byId: Map<string, GraphNode>;
  mode: PlateMode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
  onPick: (id: string) => void;
  onStudy?: () => void;
  studyLabel: string;
  onRemove?: () => void;
  onRename?: (title: string) => void;
  /** Предел высоты нижней панели: остальное — прокрутка внутри плашки, холст не схлопывается. */
  maxHeight?: number;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [title, setTitle] = useState(node.title);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const before = graph.edges.filter((e) => e.to === node.id && e.type === 'prereq');
  const after = graph.edges.filter((e) => e.from === node.id && e.type === 'prereq');
  const peek = mode === 'sheet' && !expanded;
  const canStudy = Boolean(onStudy) && state !== 'locked' && state !== 'known';
  const meta = [node.area, node.stage, ...tagsOf(node)].filter(Boolean).join(' · ');

  const group = (label: string, ids: string[], tone: 'info' | 'ok') => (
    <View style={{ gap: space.xs }}>
      <Text
        style={{ color: colors.muted, fontSize: font.caption, fontWeight: '600', letterSpacing: 1 }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {ids.length === 0 ? <Muted>{t('graphEditorNodePlate.1')}</Muted> : null}
        {ids.map((id) => {
          const n = byId.get(id);
          return n ? (
            <NeighborButton key={id} text={n.title} tone={tone} onPress={() => onPick(id)} />
          ) : null;
        })}
      </View>
    </View>
  );

  const header = (
    <View style={{ gap: space.xs }}>
      {mode === 'sheet' && (
        <Pressable
          onPress={onToggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('graphEditorNodePlate.2') : t('graphEditorNodePlate.3')}
          style={{ alignItems: 'center', minHeight: 20, justifyContent: 'center' }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line }} />
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text
          accessibilityRole="header"
          style={{ flex: 1, color: colors.ink, fontSize: font.lead, fontWeight: '600' }}
        >
          {node.title}
        </Text>
        {state && <Pill text={STATE_SHORT[state]} tone={state === 'known' ? 'core' : 'accent'} />}
        {node.kind === 'personal' && !state && (
          <Pill text={t('graphEditorNodePlate.4')} tone="core" />
        )}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('graphEditorNodePlate.5')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: colors.muted, fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>
      {meta ? <Muted>{meta}</Muted> : null}
    </View>
  );

  if (peek) {
    return (
      <PlateFrame mode={mode} maxHeight={maxHeight}>
        {header}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {canStudy && (
            <View style={{ flex: 1 }}>
              <Button label={studyLabel} onPress={onStudy!} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Button
              label={t('graphEditorNodePlate.6')}
              variant="quiet"
              onPress={onToggleExpanded}
            />
          </View>
        </View>
      </PlateFrame>
    );
  }

  return (
    <PlateFrame mode={mode} maxHeight={maxHeight}>
      <ScrollView contentContainerStyle={{ gap: space.md, paddingBottom: space.sm }}>
        {header}
        <Body>{node.content.summary ?? t('graphEditorNodePlate.7')}</Body>
        {group(
          t('graphEditorNodePlate.8'),
          before.map((e) => e.from),
          'info',
        )}
        {group(
          t('graphEditorNodePlate.9'),
          after.map((e) => e.to),
          'ok',
        )}
        <Muted>{t('graphEditorNodePlate.10')}</Muted>
        {canStudy && <Button label={studyLabel} onPress={onStudy!} />}
        {onRename && (
          <View style={{ gap: space.sm }}>
            <Field
              value={title}
              onChangeText={setTitle}
              placeholder={t('graphEditorNodePlate.11')}
              accessibilityLabel={t('graphEditorNodePlate.12')}
            />
            <Button
              label={t('graphEditorNodePlate.13')}
              variant="quiet"
              disabled={!title.trim() || title.trim() === node.title}
              onPress={() => onRename(title)}
            />
          </View>
        )}
        {onRemove &&
          (confirmRemove ? (
            <View style={{ gap: space.sm }}>
              <Muted>{t('graphEditorNodePlate.14', { title: node.title })}</Muted>
              <Button label={t('graphEditorNodePlate.15')} variant="danger" onPress={onRemove} />
              <Button
                label={t('graphEditorNodePlate.16')}
                variant="quiet"
                onPress={() => setConfirmRemove(false)}
              />
            </View>
          ) : (
            <Button
              label={t('graphEditorNodePlate.17')}
              variant="quiet"
              onPress={() => setConfirmRemove(true)}
            />
          ))}
      </ScrollView>
    </PlateFrame>
  );
}

function PlateFrame({
  mode,
  maxHeight,
  children,
}: {
  mode: PlateMode;
  maxHeight?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={mode === 'side' ? { width: 360, maxWidth: '40%', minWidth: 300 } : undefined}>
      <Card>
        <View
          style={{ gap: space.sm, maxHeight: mode === 'sheet' ? (maxHeight ?? 460) : undefined }}
        >
          {children}
        </View>
      </Card>
    </View>
  );
}

/** Кнопка-ссылка на соседа: малая кнопка общего набора (D-0003), цвет по роли связи. */
export function NeighborButton({
  text,
  tone,
  onPress,
}: {
  text: string;
  tone: 'info' | 'ok';
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Button
      size="sm"
      tone={tone}
      label={text}
      accessibilityLabel={t('graphEditorNodePlate.18', { text })}
      leading={
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: tone === 'info' ? colors.info : colors.ok,
          }}
        />
      }
      trailing="›"
      variant="quiet"
      onPress={onPress}
    />
  );
}
