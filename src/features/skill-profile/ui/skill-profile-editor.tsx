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
import { useI18n } from '@/shared/i18n';

export function SkillProfileEditor({ domain }: { domain: string }) {
  const { t } = useI18n();
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
      setError(t('skillProfileSkillProfileEditor.1'));
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
      setInfo(t('skillProfileSkillProfileEditor.2'));
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
        t('skillProfileSkillProfileEditor.3', {
          created: r.build.created,
          reused: r.build.reused,
        }) + t('skillProfileSkillProfileEditor.4'),
      );
      setCoverage(await getCoverage(domain).catch(() => null));
    });

  if (!state) return <Muted>{t('skillProfileSkillProfileEditor.5')}</Muted>;

  if (!state.exists || !draft) {
    return (
      <Card>
        <Label>{t('skillProfileSkillProfileEditor.6')}</Label>
        <Muted>{t('skillProfileSkillProfileEditor.7')}</Muted>
        {error && <Note tone="danger">{error}</Note>}
        <Button
          label={t('skillProfileSkillProfileEditor.8')}
          onPress={() => void create()}
          busy={busy}
        />
      </Card>
    );
  }

  if (state.status === 'building') {
    return (
      <Card>
        <Label>
          {state.progress
            ? t('skillProfileSkillProfileEditor.9')
            : t('skillProfileSkillProfileEditor.10')}
        </Label>
        <Muted>
          {state.progress
            ? t('skillProfileSkillProfileEditor.11')
            : t('skillProfileSkillProfileEditor.12')}
        </Muted>
        {areaProgressItems(state).length > 0 && <AreaProgress items={areaProgressItems(state)} />}
        <Button
          label={t('skillProfileSkillProfileEditor.13')}
          variant="quiet"
          onPress={() => void load()}
        />
      </Card>
    );
  }

  const outline = state.status === 'outline';

  return (
    <View style={{ gap: space.md }}>
      {outline && <Note tone="ok">{t('skillProfileSkillProfileEditor.14')}</Note>}
      <Muted>
        {t('skillProfileSkillProfileEditor.15', { skill: draft.skill, length: draft.areas.length })}
        {outline
          ? ` · ${knownLine(draft)}`
          : ` · ${t('m.conceptsAndStatus', { count: conceptCount(draft), status: state.status === 'confirmed' ? t('m.graphBuilt') : t('m.draft') })}`}
      </Muted>
      {coverage && <Note tone="ok">{t('m.inGraph', { line: coverageLine(coverage) })}</Note>}
      {state.status === 'failed' && (
        <Note tone="danger">{state.error ?? t('skillProfileSkillProfileEditor.16')}</Note>
      )}

      {draft.areas.map((area) => (
        <Card key={area.key}>
          <Label>
            {area.title}{' '}
            {area.role === 'goal'
              ? t('skillProfileSkillProfileEditor.17')
              : t('skillProfileSkillProfileEditor.18')}
          </Label>
          {area.summary !== '' && <Muted>{area.summary}</Muted>}
          {outline && area.stages.length > 0 && (
            <Muted>
              {t('m.stagesLabel')}{' '}
              {[...area.stages]
                .sort((a, b) => a.order - b.order)
                .map((s) => s.title)
                .join(' → ')}
            </Muted>
          )}
          {outline && area.known && (
            <Pill text={t('skillProfileSkillProfileEditor.19')} tone="core" />
          )}
          {outline && area.role !== 'goal' && (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label={
                  area.known
                    ? t('skillProfileSkillProfileEditor.20')
                    : t('skillProfileSkillProfileEditor.21')
                }
                variant="quiet"
                onPress={() => edit(toggleKnown(draft, area.key))}
              />
              <Button
                label={t('skillProfileSkillProfileEditor.22')}
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
                    {c.optional && (
                      <Pill text={t('skillProfileSkillProfileEditor.23')} tone="muted" />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    <Button
                      label={
                        c.optional
                          ? t('skillProfileSkillProfileEditor.24')
                          : t('skillProfileSkillProfileEditor.25')
                      }
                      variant="quiet"
                      onPress={() => edit(toggleOptional(draft, area.key, c.key))}
                    />
                    <Button
                      label={t('skillProfileSkillProfileEditor.26')}
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
              placeholder={t('skillProfileSkillProfileEditor.27')}
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
      <Button
        label={t('skillProfileSkillProfileEditor.28')}
        onPress={() => void save()}
        disabled={!dirty}
        busy={busy}
      />
      {outline ? (
        <Button
          label={t('skillProfileSkillProfileEditor.29')}
          onPress={() => void fill()}
          busy={busy}
        />
      ) : (
        <Button
          label={
            state.status === 'confirmed'
              ? t('skillProfileSkillProfileEditor.30')
              : t('skillProfileSkillProfileEditor.31')
          }
          onPress={() => void build()}
          busy={busy}
        />
      )}
      <Button
        label={t('skillProfileSkillProfileEditor.32')}
        variant="quiet"
        onPress={() => void create()}
        disabled={busy}
      />
    </View>
  );
}
