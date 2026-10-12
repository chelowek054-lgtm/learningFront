// Сборка карты по подтверждённой цели: запуск, видимый ход и итог (R-0049, R-0055, R-0056).
// Сборка идёт на сервере в фоне; экран только спрашивает статус, поэтому его можно закрыть.
// Две фазы: быстрый контур (человек его проверяет) и наполнение по областям (ход виден по каждой).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  areaProgressItems,
  fillGraph,
  getGraph,
  getProfile,
  startGraphBuild,
  type Graph,
  type ProfileState,
} from '@/shared/api';
import { AreaProgress, Button, Card, Label, Muted, Note, space } from '@/shared/ui';
import { buildView, canResume, elapsedLabel, isPending, POLL_MS } from '../model/build-progress';
import { useI18n } from '@/shared/i18n';

export function GraphBuildPanel({
  domain,
  onBuilt,
  onOpenOutline,
}: {
  domain: string;
  onBuilt: (graph: Graph) => void;
  /** Открыть экран состава навыка (контур); без него контур не показывается отдельно. */
  onOpenOutline?: () => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<ProfileState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const onBuiltRef = useRef(onBuilt);
  onBuiltRef.current = onBuilt;

  const refresh = useCallback(async () => {
    try {
      const next = await getProfile(domain);
      setState(next);
      setNow(Date.now());
      setError(null);
      if (next.status === 'confirmed') {
        const graph = await getGraph(domain);
        if (graph.nodes.length > 0) onBuiltRef.current(graph);
        else setEmpty(true);
      }
    } catch {
      setError(t('graphEditorGraphBuildPanel.1'));
    } finally {
      setLoaded(true);
    }
  }, [domain]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pending = isPending(state);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  async function start() {
    setBusy(true);
    setError(null);
    setEmpty(false);
    try {
      // Контур уже составлен — продолжаем наполнение, а не начинаем с нуля.
      setState(await (canResume(state) ? fillGraph(domain) : startGraphBuild(domain)));
      setNow(Date.now());
    } catch (e) {
      setError(`Не удалось запустить сборку: ${String(e).slice(0, 200)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <ActivityIndicator style={{ marginTop: space.lg }} />;

  const view = buildView(state, now);

  if (view.kind === 'drafting' || view.kind === 'running') {
    const items = areaProgressItems(state);
    return (
      <Card>
        <Label>
          {view.kind === 'drafting'
            ? t('graphEditorGraphBuildPanel.2')
            : t('graphEditorGraphBuildPanel.3')}{' '}
          · {elapsedLabel(view.minutes)}
        </Label>
        <ActivityIndicator style={{ alignSelf: 'flex-start' }} />
        <Muted>{view.message}</Muted>
        {items.length > 0 && <AreaProgress items={items} />}
        {error && <Note tone="warn">{error}</Note>}
      </Card>
    );
  }

  if (view.kind === 'outline') {
    return (
      <Card>
        <Label>{t('graphEditorGraphBuildPanel.4')}</Label>
        <Muted>{view.message}</Muted>
        {onOpenOutline && (
          <Button label={t('graphEditorGraphBuildPanel.5')} onPress={onOpenOutline} />
        )}
        <Button
          label={t('graphEditorGraphBuildPanel.6')}
          variant="quiet"
          onPress={() => void start()}
          busy={busy}
        />
        {error && <Note tone="danger">{error}</Note>}
      </Card>
    );
  }

  const failedLike = view.kind === 'failed' || view.kind === 'stale';
  return (
    <Card>
      <Label>
        {failedLike ? t('graphEditorGraphBuildPanel.7') : t('graphEditorGraphBuildPanel.8')}
      </Label>
      <Muted>
        {failedLike
          ? view.message
          : empty
            ? t('graphEditorGraphBuildPanel.9')
            : t('graphEditorGraphBuildPanel.10')}
      </Muted>
      {error && <Note tone="danger">{error}</Note>}
      <Button
        label={
          failedLike && canResume(state)
            ? t('graphEditorGraphBuildPanel.11')
            : failedLike || empty
              ? t('graphEditorGraphBuildPanel.12')
              : t('graphEditorGraphBuildPanel.13')
        }
        onPress={() => void start()}
        busy={busy}
      />
    </Card>
  );
}
