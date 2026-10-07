// Профиль навыка (T-0093, R-0049): человек видит, что ему нужно знать для цели, правит и строит граф.
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  areaProgressItems,
  buildFromProfile,
  fillGraph,
  getCoverage,
  getProfile,
  requestProfile,
  saveProfile,
  type CoverageReport,
  type ProfileState,
  type SkillProfile,
} from '@/shared/api';
import {
  AreaProgress,
  Body,
  Button,
  Card,
  Field,
  Label,
  Muted,
  Note,
  Pill,
  space,
} from '@/shared/ui';
import {
  addConcept,
  conceptCount,
  coverageLine,
  groupByStage,
  knownLine,
  LEVEL_LABEL,
  removeArea,
  removeConcept,
  toggleKnown,
  toggleOptional,
} from '../model/profile-model';

export function SkillProfileEditor({ domain }: { domain: string }) {
  const [state, setState] = useState<ProfileState | null>(null);
  const [draft, setDraft] = useState<SkillProfile | null>(null);
  const [dirty, setDirty] = useState(false);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [newTitles, setNewTitles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await getProfile(domain);
      setState(s);
      setDraft(s.profile);
      setDirty(false);
      if (s.exists && s.profile) setCoverage(await getCoverage(domain).catch(() => null));
    } catch {
      setError('Не удалось загрузить профиль. Попробуйте позже.');
    }
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  // Пока идёт сборка, спрашиваем ход сами: готовность не должна ждать нажатия «Обновить».
  const building = state?.status === 'building' && !state.stale;
  useEffect(() => {
    if (!building) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [building, load]);

  const edit = (next: SkillProfile) => {
    setDraft(next);
    setDirty(true);
    setInfo(null);
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const create = () =>
    run(async () => {
      setState(await requestProfile(domain));
      await load();
    });

  const save = () =>
    run(async () => {
      if (!draft) return;
      setState(await saveProfile(domain, draft));
      setDirty(false);
      setInfo('Правки сохранены.');
    });

  // «Собрать карту»: контур подтверждён, наполнение идёт в фоне по всем областям сразу.
  const fill = () =>
    run(async () => {
      if (draft && dirty) await saveProfile(domain, draft);
      setState(await fillGraph(domain));
      setDirty(false);
    });

  const build = () =>
    run(async () => {
      if (draft && dirty) await saveProfile(domain, draft);
      const r = await buildFromProfile(domain);
      setState(r);
      setDraft(r.profile);
      setDirty(false);
      setInfo(
        `Граф дополнен: новых понятий ${r.build.created}, уже было ${r.build.reused}. ` +
          'Убранное здесь из построенного графа не удаляется.',
      );
      setCoverage(await getCoverage(domain).catch(() => null));
    });

  if (!state) return <Muted>Загружаю профиль…</Muted>;

  if (!state.exists || !draft) {
    return (
      <Card>
        <Label>Профиля пока нет</Label>
        <Muted>
          Составим полное описание: из каких областей состоит навык и что в каждой нужно знать, с
          этапами и уровнем сложности. Построение занимает время.
        </Muted>
        {error && <Note tone="danger">{error}</Note>}
        <Button label="Составить профиль" onPress={() => void create()} busy={busy} />
      </Card>
    );
  }

  if (state.status === 'building') {
    return (
      <Card>
        <Label>{state.progress ? 'Карта собирается' : 'Составляем контур навыка'}</Label>
        <Muted>
          {state.progress
            ? 'Каждая область наполняется отдельно; можно закрыть экран — сборка продолжится.'
            : 'Обычно около минуты.'}
        </Muted>
        {areaProgressItems(state).length > 0 && <AreaProgress items={areaProgressItems(state)} />}
        <Button label="Обновить" variant="quiet" onPress={() => void load()} />
      </Card>
    );
  }

  const outline = state.status === 'outline';

  return (
    <View style={{ gap: space.md }}>
      {outline && (
        <Note tone="ok">
          Контур готов: проверьте, из чего состоит навык. Отметьте области, которые уже знаете, — по
          ним понятий будет меньше. Потом соберите карту.
        </Note>
      )}
      <Muted>
        {draft.skill} · {draft.areas.length} обл.
        {outline
          ? ` · ${knownLine(draft)}`
          : ` · ${conceptCount(draft)} понятий · ${state.status === 'confirmed' ? 'граф построен' : 'черновик'}`}
      </Muted>
      {coverage && <Note tone="ok">В графе: {coverageLine(coverage)}</Note>}
      {state.status === 'failed' && (
        <Note tone="danger">{state.error ?? 'Профиль не построился.'}</Note>
      )}

      {draft.areas.map((area) => (
        <Card key={area.key}>
          <Label>
            {area.title} {area.role === 'goal' ? '· цель' : '· основа'}
          </Label>
          {area.summary !== '' && <Muted>{area.summary}</Muted>}
          {outline && area.stages.length > 0 && (
            <Muted>
              Этапы:{' '}
              {[...area.stages]
                .sort((a, b) => a.order - b.order)
                .map((s) => s.title)
                .join(' → ')}
            </Muted>
          )}
          {outline && area.known && <Pill text="уже владею" tone="core" />}
          {outline && area.role !== 'goal' && (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label={area.known ? 'Не знаю' : 'Уже владею'}
                variant="quiet"
                onPress={() => edit(toggleKnown(draft, area.key))}
              />
              <Button
                label="Убрать область"
                variant="quiet"
                onPress={() => edit(removeArea(draft, area.key))}
              />
            </View>
          )}
          {groupByStage(area).map((group) => (
            <View key={group.key ?? 'none'} style={{ gap: space.xs }}>
              <Muted>{group.title}</Muted>
              {group.concepts.map((c) => (
                <View key={c.key} style={{ gap: space.xs }}>
                  <Body>{c.title}</Body>
                  <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                    {c.level && <Pill text={LEVEL_LABEL[c.level]} />}
                    {c.optional && <Pill text="необязательное" tone="muted" />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    <Button
                      label={c.optional ? 'Сделать обязательным' : 'Необязательное'}
                      variant="quiet"
                      onPress={() => edit(toggleOptional(draft, area.key, c.key))}
                    />
                    <Button
                      label="Убрать"
                      variant="quiet"
                      onPress={() => edit(removeConcept(draft, area.key, c.key))}
                    />
                  </View>
                </View>
              ))}
            </View>
          ))}
          {!outline && (
            <Field
              placeholder="добавить своё понятие"
              value={newTitles[area.key] ?? ''}
              onChangeText={(v) => setNewTitles((p) => ({ ...p, [area.key]: v }))}
              onSubmitEditing={() => {
                edit(
                  addConcept(
                    draft,
                    area.key,
                    area.stages[0]?.key ?? null,
                    newTitles[area.key] ?? '',
                  ),
                );
                setNewTitles((p) => ({ ...p, [area.key]: '' }));
              }}
            />
          )}
        </Card>
      ))}

      {error && <Note tone="danger">{error}</Note>}
      {info && <Note tone="ok">{info}</Note>}
      <Button label="Сохранить правки" onPress={() => void save()} disabled={!dirty} busy={busy} />
      {outline ? (
        <Button label="Собрать карту" onPress={() => void fill()} busy={busy} />
      ) : (
        <Button
          label={
            state.status === 'confirmed' ? 'Дополнить граф по профилю' : 'Построить граф по профилю'
          }
          onPress={() => void build()}
          busy={busy}
        />
      )}
      <Button
        label="Составить заново"
        variant="quiet"
        onPress={() => void create()}
        disabled={busy}
      />
    </View>
  );
}
