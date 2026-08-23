// Редактор графа знаний (KG2-03..05): список узлов по тирам + фокус-узел с соседями
// и действиями (углубиться / подтвердить в ядро / править). UX под телефон — без canvas.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  approveNode,
  buildCanon,
  expandNode,
  getGraph,
  overrideNode,
  patchUserNode,
  type Graph,
  type GraphNode,
} from '@/shared/api';

export function GraphExplorer({ domain }: { domain: string }) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState('');
  const [editSummary, setEditSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setGraph(await getGraph(domain));
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  const nodes = graph?.nodes ?? [];
  const core = nodes.filter((n) => n.tier === 'core');
  const derived = nodes.filter((n) => n.tier !== 'core');
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const neighbors = useMemo(() => {
    if (!graph || !selected) return [];
    const byId = new Map(graph.nodes.map((n) => [n.id, n.title]));
    return graph.edges
      .filter((e) => e.from === selected.id || e.to === selected.id)
      .map((e) => {
        const out = e.from === selected.id;
        const otherId = out ? e.to : e.from;
        return `${out ? '→' : '←'} ${byId.get(otherId) ?? otherId} (${e.type})`;
      });
  }, [graph, selected]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deepen() {
    if (!selected || !direction.trim()) return;
    setBusy(true);
    try {
      setGraph(await expandNode(selected.id, direction.trim()));
      setDirection('');
    } finally {
      setBusy(false);
    }
  }

  async function saveSummary() {
    if (!selected || editSummary === null) return;
    const content = { ...selected.content, summary: editSummary };
    await run(() =>
      selected.kind === 'personal' && selected.userConceptId
        ? patchUserNode(selected.userConceptId, { content })
        : overrideNode(selected.id, content),
    );
    setEditSummary(null);
  }

  if (!graph) return <ActivityIndicator style={styles.pad} />;

  if (nodes.length === 0) {
    return (
      <View style={styles.pad}>
        <Text style={styles.empty}>Граф «{domain}» пуст.</Text>
        <Pressable
          style={styles.btn}
          onPress={() => run(() => buildCanon(domain, 'Трансформеры'))}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Построить граф (LLM)</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      {!selected && (
        <>
          <Section
            title={`Ядро · обязательное (${core.length})`}
            nodes={core}
            onPick={setSelectedId}
          />
          <Section title={`Ветви (${derived.length})`} nodes={derived} onPick={setSelectedId} />
        </>
      )}

      {selected && (
        <View style={styles.detail}>
          <Pressable onPress={() => setSelectedId(null)}>
            <Text style={styles.back}>← К списку</Text>
          </Pressable>
          <Text style={styles.title}>{selected.title}</Text>
          <Text style={styles.meta}>
            {selected.tier} · centrality {selected.centrality} · {selected.origin} ·{' '}
            {selected.status}
          </Text>

          {editSummary === null ? (
            <Text style={styles.summary}>{selected.content.summary ?? '—'}</Text>
          ) : (
            <TextInput
              style={styles.input}
              multiline
              value={editSummary}
              onChangeText={setEditSummary}
            />
          )}

          <Text style={styles.sub}>Соседи</Text>
          {neighbors.length === 0 && <Text style={styles.dim}>нет связей</Text>}
          {neighbors.map((n) => (
            <Text key={n} style={styles.neighbor}>
              {n}
            </Text>
          ))}

          <View style={styles.actions}>
            {editSummary === null ? (
              <Pressable
                style={styles.act}
                onPress={() => setEditSummary(selected.content.summary ?? '')}
              >
                <Text style={styles.actText}>Править</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.act} onPress={saveSummary} disabled={busy}>
                <Text style={styles.actText}>Сохранить</Text>
              </Pressable>
            )}
            {selected.kind === 'canonical' && selected.tier !== 'core' && (
              <Pressable
                style={styles.act}
                onPress={() => run(() => approveNode(selected.id, 'core'))}
                disabled={busy}
              >
                <Text style={styles.actText}>В ядро</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.sub}>Углубиться (LLM дорастит ветку)</Text>
          <View style={styles.deepenRow}>
            <TextInput
              style={[styles.input, styles.deepenInput]}
              placeholder="направление интереса"
              value={direction}
              onChangeText={setDirection}
            />
            <Pressable style={styles.act} onPress={deepen} disabled={busy || !direction.trim()}>
              <Text style={styles.actText}>Расти</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Section({
  title,
  nodes,
  onPick,
}: {
  title: string;
  nodes: GraphNode[];
  onPick: (id: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {nodes.map((n) => (
        <Pressable key={n.id} style={styles.row} onPress={() => onPick(n.id)}>
          <Text style={styles.rowTitle}>{n.title}</Text>
          <Text style={styles.rowMeta}>
            c{n.centrality} · {n.origin}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  empty: { fontSize: 15, opacity: 0.6 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', opacity: 0.6, marginTop: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 12,
  },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowMeta: { fontSize: 11, opacity: 0.5 },
  detail: { gap: 8 },
  back: { color: '#2563eb' },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 12, opacity: 0.6 },
  summary: { fontSize: 15, lineHeight: 21 },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  dim: { fontSize: 13, opacity: 0.4 },
  neighbor: { fontSize: 13, fontFamily: 'monospace' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  act: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  actText: { color: '#fff', fontWeight: '600' },
  deepenRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deepenInput: { flex: 1 },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
