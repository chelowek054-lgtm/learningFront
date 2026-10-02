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

export function GoalPlanner({
  domain,
  topic,
  onBuilt,
}: {
  domain: string;
  topic: string;
  onBuilt: (graph: Graph) => void;
}) {
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
      setError(`Не удалось разбить цель: ${String(e).slice(0, 200)}`);
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
      setError(`Не удалось построить карту: ${String(e).slice(0, 200)}`);
    } finally {
      setBusy(null);
    }
  }

  if (!parts) {
    return (
      <>
        {error && <Note tone="danger">{error}</Note>}
        <Button
          label="Разбить цель на части"
          onPress={() => void split()}
          busy={busy === 'split'}
          disabled={!topic.trim()}
        />
        <Muted>Сначала вы увидите, на какие части делится цель, и сможете поправить.</Muted>
      </>
    );
  }

  const budget = budgetFor(parts, limit);
  return (
    <View style={{ gap: space.md }}>
      <Label>Из чего будет состоять цель</Label>
      <Muted>
        Части идут от основ к зависимым. Уберите лишнее или переименуйте — построится то, что
        останется.
      </Muted>
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
              После: {p.prereqs.map((k) => parts.find((x) => x.key === k)?.title ?? k).join(', ')}
            </Muted>
          )}
          <Button
            label="Убрать"
            variant="quiet"
            onPress={() => setParts((prev) => (prev ? removeSubdomain(prev, p.key) : prev))}
          />
        </Card>
      ))}
      <Body>
        Построение: {budget.requests} запрос(ов) к модели, по одному на часть. Это занимает
        несколько минут.
      </Body>
      {error && <Note tone="danger">{error}</Note>}
      <Button
        label="Построить карту"
        onPress={() => void build()}
        busy={busy === 'build'}
        disabled={!canBuild(parts)}
      />
      <Button label="Заново разбить" variant="quiet" onPress={() => setParts(null)} />
    </View>
  );
}
