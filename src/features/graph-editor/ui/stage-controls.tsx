// Управление обзором по этапам (R-0070): переключатель «Этапы / Всё», путь «Все этапы › Х» со сводкой,
// «Вся цепочка» и плашка со списком связей между двумя этапами. Одни и те же во встроенной схеме и во весь экран.
import { Text, View } from 'react-native';
import type { GraphNode } from '@/shared/api';
import { Button, Card, Chip, font, Label, Muted, space, useTheme } from '@/shared/ui';
import { stageSummary, type StageLink } from '../model/overview';
import type { SchemeScene, SchemeViewMode } from './use-scheme-scene';
import { useI18n, translate } from '@/shared/i18n';

const VIEW_LABEL: Record<Exclude<SchemeViewMode, 'auto'>, string> = {
  get stages() {
    return translate('graphEditorStageControls.1');
  },
  get all() {
    return translate('graphEditorStageControls.2');
  },
};

export function StageControls({
  scene,
  selected,
  stageTitle,
}: {
  scene: SchemeScene;
  selected: string | null;
  /** Название этапа по ключу: для пути «Все этапы › Х». */
  stageTitle: (key: string) => string;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  if (!scene.switchable && scene.areas.length === 0) return null;
  const current = scene.grouped ? 'stages' : 'all';
  const keys = scene.expandedKeys;
  const one = keys.length === 1 ? keys[0]! : null;
  const summary = one && scene.overview ? stageSummary(scene.overview.links, one) : null;
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' }}>
        <Muted>{t('graphEditorStageControls.3')}</Muted>
        {(['stages', 'all'] as const).map((v) => (
          <Chip
            key={v}
            size="sm"
            text={VIEW_LABEL[v]}
            selected={current === v}
            onPress={() => scene.setView(v)}
          />
        ))}
        {scene.grouped && selected && (
          <Chip
            size="sm"
            text={t('graphEditorStageControls.4')}
            selected={scene.fullChain}
            onPress={() => scene.setFullChain(!scene.fullChain)}
          />
        )}
      </View>
      {scene.areas.length > 0 && (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' }}
        >
          <Muted>{t('graphEditorStageControls.5')}</Muted>
          {scene.areas.map((a) => (
            <Chip
              key={a.name}
              size="sm"
              text={a.collapsed ? `▸ ${a.name}` : `▾ ${a.name}`}
              selected={!a.collapsed}
              onPress={() => scene.toggleArea(a.name)}
            />
          ))}
        </View>
      )}
      {scene.grouped && keys.length > 0 && (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' }}
        >
          <Button
            size="sm"
            variant="quiet"
            label={t('graphEditorStageControls.6')}
            onPress={scene.collapseAll}
          />
          <Text style={{ color: colors.muted, fontSize: font.small }}>›</Text>
          <Text style={{ color: colors.ink, fontSize: font.small, fontWeight: '600' }}>
            {one ? stageTitle(one) : t('graphEditorStageControls.7', { length: keys.length })}
          </Text>
          {summary && (
            <Muted>
              {' · '}
              {t('m.stageSummary', { before: summary.before, after: summary.after })}
            </Muted>
          )}
        </View>
      )}
    </View>
  );
}

/** Список связей между двумя этапами: каждая — пара понятий-ссылок; нажатие переносит выбор на понятие. */
export function StageLinksCard({
  link,
  byId,
  stageTitle,
  onPick,
  onClose,
}: {
  link: StageLink;
  byId: Map<string, GraphNode>;
  stageTitle: (key: string) => string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <Label>
        {stageTitle(link.from)} → {stageTitle(link.to)} ·{' '}
        {t('m.linksCount', { count: link.edges.length })}
      </Label>
      <View style={{ gap: space.sm }}>
        {link.edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          return (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: space.xs,
                alignItems: 'center',
              }}
            >
              <Button
                size="sm"
                tone="info"
                variant="quiet"
                label={a.title}
                onPress={() => onPick(a.id)}
              />
              <Muted>→</Muted>
              <Button
                size="sm"
                tone="ok"
                variant="quiet"
                label={b.title}
                onPress={() => onPick(b.id)}
              />
            </View>
          );
        })}
      </View>
      <Button size="sm" variant="quiet" label={t('graphEditorStageControls.8')} onPress={onClose} />
    </Card>
  );
}
