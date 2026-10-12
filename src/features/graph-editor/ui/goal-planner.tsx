// Построение карты в два шага (T-0060): сначала модель предлагает разбиение цели на
// части, человек его видит и правит, и только потом строится граф — по запросу на часть.
// Разбиение никогда не принимается молча, а цена построения известна заранее.
import { useState } from 'react';
import { View } from 'react-native';
import { buildGoal, splitGoal, type Graph } from '@/shared/api';
import { Body, Button, Card, Field, Label, Muted, Note, space } from '@/shared/ui';
import {
  budgetFor,
  canBuild,
  orderByPrereqs,
  removeSubdomain,
  renameSubdomain,
  toPayload,
  type BuildBudget,
  type Subdomain,
} from '../model/split-edit';
import { useI18n } from '@/shared/i18n';

export function GoalPlanner({
  domain,
  topic,
  onBuilt,
}: {
  domain: string;
  topic: string;
  onBuilt: (graph: Graph) => void;
}) {
  const { t } = useI18n();
  const [parts, setParts] = useState<Subdomain[] | null>(null);
  const [limit, setLimit] = useState(8);
  const [busy, setBusy] = useState<'split' | 'build' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function split() {
    setBusy('split');
    setError(null);
    try {
      const r = await splitGoal(domain, topic.trim());
      setParts(r.subdomains);
      setLimit((r.budget as BuildBudget).limit);
    } catch (e) {
      setError(t('m.splitFailed', { error: String(e).slice(0, 200) }));
    } finally {
      setBusy(null);
    }
  }

  async function build() {
    if (!parts) return;
    setBusy('build');
    setError(null);
    try {
      const r = await buildGoal(domain, topic.trim(), toPayload(parts));
      onBuilt(r.graph);
    } catch (e) {
      setError(t('m.buildFailed', { error: String(e).slice(0, 200) }));
    } finally {
      setBusy(null);
    }
  }

  if (!parts) {
    return (
      <>
        {error && <Note tone="danger">{error}</Note>}
        <Button
          label={t('graphEditorGoalPlanner.1')}
          onPress={() => void split()}
          busy={busy === 'split'}
          disabled={!topic.trim()}
        />
        <Muted>{t('graphEditorGoalPlanner.2')}</Muted>
      </>
    );
  }

  const budget = budgetFor(parts, limit);
  return (
    <View style={{ gap: space.md }}>
      <Label>{t('graphEditorGoalPlanner.3')}</Label>
      <Muted>{t('graphEditorGoalPlanner.4')}</Muted>
      {orderByPrereqs(parts).map((p) => (
        <Card key={p.key}>
          <Field
            value={p.title}
            onChangeText={(v) =>
              setParts((prev) => (prev ? renameSubdomain(prev, p.key, v) : prev))
            }
          />
          {!!p.summary && <Muted>{p.summary}</Muted>}
          {p.prereqs.length > 0 && (
            <Muted>
              {t('m.after', {
                list: p.prereqs.map((k) => parts.find((x) => x.key === k)?.title ?? k).join(', '),
              })}
            </Muted>
          )}
          <Button
            label={t('graphEditorGoalPlanner.5')}
            variant="quiet"
            onPress={() => setParts((prev) => (prev ? removeSubdomain(prev, p.key) : prev))}
          />
        </Card>
      ))}
      <Body>{t('m.buildBudget', { count: budget.requests })}</Body>
      {error && <Note tone="danger">{error}</Note>}
      <Button
        label={t('graphEditorGoalPlanner.7')}
        onPress={() => void build()}
        busy={busy === 'build'}
        disabled={!canBuild(parts)}
      />
      <Button
        label={t('graphEditorGoalPlanner.8')}
        variant="quiet"
        onPress={() => setParts(null)}
      />
    </View>
  );
}
