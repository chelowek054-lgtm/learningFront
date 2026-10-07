// Профиль навыка (T-0093, R-0049): человек видит, что ему нужно знать для цели, правит и строит граф.
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  buildFromProfile,
  getCoverage,
  getProfile,
  requestProfile,
  saveProfile,
  type CoverageReport,
  type ProfileState,
  type SkillProfile,
} from '@/shared/api';
import { Body, Button, Card, Field, Label, Muted, Note, Pill, space } from '@/shared/ui';
import {
  addConcept,
  conceptCount,
  coverageLine,
  groupByStage,
  LEVEL_LABEL,
  removeConcept,
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
        <Label>Профиль строится</Label>
        <Muted>Это может занять несколько минут. Откройте экран позже.</Muted>
        <Button label="Обновить" variant="quiet" onPress={() => void load()} />
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <Muted>
        {draft.skill} · {draft.areas.length} обл. · {conceptCount(draft)} понятий ·{' '}
        {state.status === 'confirmed' ? 'граф построен' : 'черновик'}
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
          <Field
            placeholder="добавить своё понятие"
            value={newTitles[area.key] ?? ''}
            onChangeText={(v) => setNewTitles((p) => ({ ...p, [area.key]: v }))}
            onSubmitEditing={() => {
              edit(
                addConcept(draft, area.key, area.stages[0]?.key ?? null, newTitles[area.key] ?? ''),
              );
              setNewTitles((p) => ({ ...p, [area.key]: '' }));
            }}
          />
        </Card>
      ))}

      {error && <Note tone="danger">{error}</Note>}
      {info && <Note tone="ok">{info}</Note>}
      <Button label="Сохранить правки" onPress={() => void save()} disabled={!dirty} busy={busy} />
      <Button
        label={
          state.status === 'confirmed' ? 'Дополнить граф по профилю' : 'Построить граф по профилю'
        }
        onPress={() => void build()}
        busy={busy}
      />
      <Button
        label="Составить заново"
        variant="quiet"
        onPress={() => void create()}
        disabled={busy}
      />
    </View>
  );
}
