// Сборка карты по подтверждённой цели: запуск, видимый ход и итог (R-0049, T-0090).
// Сборка идёт на сервере в фоне; экран только спрашивает статус, поэтому его можно закрыть.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { getGraph, getProfile, startGraphBuild, type Graph, type ProfileState } from '@/shared/api';
import { Button, Card, Label, Muted, Note, space } from '@/shared/ui';
import { buildView, elapsedLabel, isPending, POLL_MS } from '../model/build-progress';

export function GraphBuildPanel({
  domain,
  onBuilt,
}: {
  domain: string;
  onBuilt: (graph: Graph) => void;
}) {
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
      setError('Нет связи с сервером. Сборка продолжается, проверим ещё раз.');
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
      setState(await startGraphBuild(domain));
      setNow(Date.now());
    } catch (e) {
      setError(`Не удалось запустить сборку: ${String(e).slice(0, 200)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <ActivityIndicator style={{ marginTop: space.lg }} />;

  const view = buildView(state, now);

  if (view.kind === 'running') {
    return (
      <Card>
        <Label>Карта собирается · {elapsedLabel(view.minutes)}</Label>
        <ActivityIndicator style={{ alignSelf: 'flex-start' }} />
        <Muted>{view.message}</Muted>
        {error && <Note tone="warn">{error}</Note>}
      </Card>
    );
  }

  const failedLike = view.kind === 'failed' || view.kind === 'stale';
  return (
    <Card>
      <Label>{failedLike ? 'Сборка не завершилась' : 'Карты пока нет'}</Label>
      <Muted>
        {failedLike
          ? view.message
          : empty
            ? 'Сборка закончилась, но карта получилась пустой. Запустите её ещё раз.'
            : 'Соберём её по вашей цели: полный перечень того, что нужно знать, по областям и этапам.'}
      </Muted>
      {error && <Note tone="danger">{error}</Note>}
      <Button
        label={failedLike || empty ? 'Запустить заново' : 'Собрать карту'}
        onPress={() => void start()}
        busy={busy}
      />
    </Card>
  );
}
