// Адаптивный плейсмент (KG4-04): сначала пользователь задаёт целевую ступень,
// затем идут зонды на границе знаний, в конце — карта освоенности.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  answerProbe,
  masteryMap,
  nextProbe,
  type MasteryMap,
  type Probe,
  type ProbeResult,
  type StopCode,
} from '@/shared/api';

/** Останов — не ошибка, но и не всегда успех: пользователю нужен следующий шаг. */
const STOP: Record<StopCode, { title: string; hint: string }> = {
  empty: {
    title: 'Граф этой области ещё не построен',
    hint: 'Определять уровень пока не по чему. Граф готовит администратор.',
  },
  no_theory: {
    title: 'В узлах графа пока нет теории',
    hint: 'Вопросы строятся из содержания узлов, а его ещё не наполнили. Попросите администратора достроить граф — после этого проверка уровня заработает.',
  },
  settled: {
    title: 'Уровень определён',
    hint: 'Уточнять больше нечего — карта ниже отражает текущую картину.',
  },
};

/** Целевая ступень — первый шаг: она задаёт потолок для всех зондов. */
const TARGETS = [
  { key: 'remember', label: 'Вспомнить', hint: 'узнаю термины' },
  { key: 'understand', label: 'Понять', hint: 'объясню своими словами' },
  { key: 'apply', label: 'Применить', hint: 'решу задачу' },
  { key: 'create', label: 'Создать', hint: 'построю своё' },
] as const;

type Phase = 'target' | 'probing' | 'done';

function isProbe(r: ProbeResult): r is Probe {
  return !('done' in r && r.done);
}

export function PlacementSession({ domain }: { domain: string }) {
  const [phase, setPhase] = useState<Phase>('target');
  const [target, setTarget] = useState<string>('understand');
  const [probe, setProbe] = useState<Probe | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stop, setStop] = useState<StopCode | null>(null);
  const [map, setMap] = useState<MasteryMap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(0);

  const finish = useCallback(async (reason?: string) => {
    setProbe(null);
    setPhase('done');
    if (reason) setFeedback(reason);
    setMap(await masteryMap(domain));
  }, [domain]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await nextProbe(domain, target);
      if (isProbe(result)) {
        setProbe(result);
        setPhase('probing');
      } else {
        setMap(result.map);
        setStop(result.code);
        setPhase('done');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [domain, target]);

  async function submit(value: unknown) {
    if (!probe) return;
    setBusy(true);
    setError(null);
    try {
      const result = await answerProbe(domain, probe.conceptId, probe.bloom, value);
      setFeedback(result.explanation);
      setAsked((n) => n + 1);
      setAnswer('');
      if (result.next) setProbe(result.next);
      else {
        setStop(result.code ?? 'settled');
        await finish();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (phase === 'done' && !map) void masteryMap(domain).then(setMap);
  }, [phase, map, domain]);

  if (phase === 'target') {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>До какого уровня хотите дойти?</Text>
        <Text style={styles.dim}>
          Это потолок для вопросов. Начнём с самых фундаментальных узлов и будем спускаться туда,
          где меньше всего ясности.
        </Text>
        {TARGETS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.choice, target === t.key && styles.choiceOn]}
            onPress={() => setTarget(t.key)}
          >
            <Text style={styles.choiceLabel}>{t.label}</Text>
            <Text style={styles.dim}>{t.hint}</Text>
          </Pressable>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.btn} onPress={start} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Начать</Text>}
        </Pressable>
      </ScrollView>
    );
  }

  if (phase === 'probing' && probe) {
    const hasOptions = probe.item.options.length > 0;
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.eyebrow}>
          вопрос {asked + 1} · {probe.conceptTitle} · {probe.bloom}
        </Text>
        <Text style={styles.question}>{probe.item.prompt}</Text>

        {hasOptions ? (
          probe.item.options.map((o, i) => (
            <Pressable key={o.text} style={styles.option} onPress={() => submit(i)} disabled={busy}>
              <Text style={styles.optionText}>{o.text}</Text>
            </Pressable>
          ))
        ) : (
          <>
            <TextInput
              style={styles.input}
              multiline
              placeholder="ответьте своими словами"
              value={answer}
              onChangeText={setAnswer}
            />
            <Pressable style={styles.btn} onPress={() => submit(answer)} disabled={busy || !answer.trim()}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Ответить</Text>}
            </Pressable>
          </>
        )}

        {feedback && <Text style={styles.dim}>{feedback}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={() => finish('Плейсмент прерван — карта построена по уже данным ответам.')}>
          <Text style={styles.link}>Достаточно, покажите карту</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{stop ? STOP[stop].title : 'Карта знаний'}</Text>
      {stop && <Text style={styles.dim}>{STOP[stop].hint}</Text>}
      {!stop && feedback && <Text style={styles.dim}>{feedback}</Text>}
      {!map ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.dim}>
            Освоено {map.summary.known ?? 0} · в работе {map.summary.learning ?? 0} · на границе{' '}
            {map.summary.frontier ?? 0} · закрыто {map.summary.locked ?? 0}
          </Text>
          {!map.coreCovered && (
            <Text style={styles.warn}>Фундаментальное ядро пройдено не полностью — курс начнётся с него.</Text>
          )}
          {map.nodes.map((n) => (
            <View key={n.conceptId} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                <Text style={styles.dim}>
                  {n.tier === 'core' ? 'ядро' : 'ветвь'} · {STATUS[n.status]}
                  {n.bloom_reached ? ` · ${n.bloom_reached}` : ''}
                </Text>
              </View>
              <View style={styles.meter}>
                <View style={[styles.meterFill, { width: `${Math.round(n.estimate * 100)}%` }]} />
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const STATUS: Record<string, string> = {
  known: 'освоено',
  learning: 'в работе',
  frontier: 'на границе',
  locked: 'ждёт предпосылок',
};

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  h1: { fontSize: 24, fontWeight: '700' },
  eyebrow: { fontSize: 12, opacity: 0.6, textTransform: 'uppercase' },
  question: { fontSize: 18, lineHeight: 25, fontWeight: '500' },
  dim: { fontSize: 13, opacity: 0.6, lineHeight: 19 },
  warn: { fontSize: 13, color: '#b45309' },
  error: { fontSize: 13, color: '#dc2626' },
  link: { color: '#2563eb', marginTop: 8 },
  choice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 14,
    gap: 2,
  },
  choiceOn: { borderColor: '#2563eb', borderWidth: 2 },
  choiceLabel: { fontSize: 16, fontWeight: '600' },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 14,
  },
  optionText: { fontSize: 15, lineHeight: 21 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  row: { gap: 6, paddingVertical: 8 },
  rowMain: { gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  meter: { height: 6, backgroundColor: '#8882', borderRadius: 99, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 99 },
});
