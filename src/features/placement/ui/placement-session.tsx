// Адаптивный плейсмент (KG4-04): сначала пользователь задаёт целевую ступень,
// затем идут зонды на границе знаний, в конце — карта освоенности.
import { useCallback, useEffect, useState } from 'react';
import { MASTERY_TARGETS } from '@/entities/session';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, type Palette } from '@/shared/ui';
import {
  answerProbe,
  masteryMap,
  nextProbe,
  type MasteryMap,
  type Probe,
  type ProbeResult,
  type StopCode,
} from '@/shared/api';
import { useI18n, translate } from '@/shared/i18n';

/** Останов — не ошибка, но и не всегда успех: пользователю нужен следующий шаг. */
const STOP: Record<StopCode, { title: string; hint: string }> = {
  empty: {
    get title() {
      return translate('placementPlacementSession.1');
    },
    get hint() {
      return translate('placementPlacementSession.2');
    },
  },
  no_theory: {
    get title() {
      return translate('placementPlacementSession.3');
    },
    get hint() {
      return translate('placementPlacementSession.4');
    },
  },
  settled: {
    get title() {
      return translate('placementPlacementSession.5');
    },
    get hint() {
      return translate('placementPlacementSession.6');
    },
  },
};

/** Целевая ступень — первый шаг: она задаёт потолок для всех зондов.
 *  Список общий с онбордингом и курсом (entities/session). */
const TARGETS = MASTERY_TARGETS;

type Phase = 'target' | 'probing' | 'done';

function isProbe(r: ProbeResult): r is Probe {
  return !('done' in r && r.done);
}

export function PlacementSession({ domain }: { domain: string }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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

  const finish = useCallback(
    async (reason?: string) => {
      setProbe(null);
      setPhase('done');
      if (reason) setFeedback(reason);
      setMap(await masteryMap(domain));
    },
    [domain],
  );

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
        <Text style={styles.h1}>{t('placementPlacementSession.7')}</Text>
        <Text style={styles.dim}>{t('m.placementCeiling')}</Text>
        {TARGETS.map((t) => (
          <Pressable
            key={t.bloom}
            style={[styles.choice, target === t.bloom && styles.choiceOn]}
            onPress={() => setTarget(t.bloom)}
          >
            <Text style={styles.choiceLabel}>{t.short}</Text>
            <Text style={styles.dim}>{t.short}</Text>
          </Pressable>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.btn} onPress={start} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.btnText}>{t('placementPlacementSession.9')}</Text>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  if (phase === 'probing' && probe) {
    const hasOptions = probe.item.options.length > 0;
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.eyebrow}>
          {t('m.probeLine', { n: asked + 1, concept: probe.conceptTitle, bloom: probe.bloom })}
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
              placeholder={t('placementPlacementSession.10')}
              value={answer}
              onChangeText={setAnswer}
            />
            <Pressable
              style={styles.btn}
              onPress={() => submit(answer)}
              disabled={busy || !answer.trim()}
            >
              {busy ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.btnText}>{t('placementPlacementSession.11')}</Text>
              )}
            </Pressable>
          </>
        )}

        {feedback && <Text style={styles.dim}>{feedback}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={() => finish(t('placementPlacementSession.12'))}>
          <Text style={styles.link}>{t('placementPlacementSession.13')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{stop ? STOP[stop].title : t('placementPlacementSession.14')}</Text>
      {stop && <Text style={styles.dim}>{STOP[stop].hint}</Text>}
      {!stop && feedback && <Text style={styles.dim}>{feedback}</Text>}
      {!map ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.dim}>
            {t('m.mapSummary', {
              known: map.summary.known ?? 0,
              learning: map.summary.learning ?? 0,
              frontier: map.summary.frontier ?? 0,
              locked: map.summary.locked ?? 0,
            })}
          </Text>
          {!map.coreCovered && <Text style={styles.warn}>{t('placementPlacementSession.15')}</Text>}
          {map.nodes.map((n) => (
            <View key={n.conceptId} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                <Text style={styles.dim}>
                  {n.tier === 'core'
                    ? t('placementPlacementSession.16')
                    : t('placementPlacementSession.17')}{' '}
                  · {STATUS[n.status]}
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
  get known() {
    return translate('placementPlacementSession.18');
  },
  get learning() {
    return translate('placementPlacementSession.19');
  },
  get frontier() {
    return translate('placementPlacementSession.20');
  },
  get locked() {
    return translate('placementPlacementSession.21');
  },
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    pad: { padding: 16, gap: 12 },
    h1: { fontSize: 24, fontWeight: '700', color: c.ink },
    eyebrow: { fontSize: 12, color: c.muted, textTransform: 'uppercase' },
    question: { fontSize: 18, lineHeight: 25, fontWeight: '500', color: c.ink },
    dim: { fontSize: 13, color: c.muted, lineHeight: 19 },
    warn: { fontSize: 13, color: c.warn },
    error: { fontSize: 13, color: c.danger },
    link: { color: c.accent, marginTop: 8 },
    choice: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      borderRadius: 10,
      padding: 14,
      gap: 2,
    },
    choiceOn: { borderColor: c.accent, borderWidth: 2 },
    choiceLabel: { fontSize: 16, fontWeight: '600', color: c.ink },
    option: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      borderRadius: 10,
      padding: 14,
    },
    optionText: { fontSize: 15, lineHeight: 21, color: c.ink },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      minHeight: 96,
      textAlignVertical: 'top',
      color: c.ink,
      backgroundColor: c.surface,
    },
    btn: { backgroundColor: c.accent, borderRadius: 10, padding: 14, alignItems: 'center' },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: '600' },
    row: { gap: 6, paddingVertical: 8 },
    rowMain: { gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: '500', color: c.ink },
    meter: { height: 6, backgroundColor: c.surfaceAlt, borderRadius: 99, overflow: 'hidden' },
    meterFill: { height: '100%', backgroundColor: c.accent, borderRadius: 99 },
  });
