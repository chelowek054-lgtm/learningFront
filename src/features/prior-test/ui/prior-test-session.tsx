// Проверка предварительных знаний (T-0075, R-0042): короткий тест по базовым областям цели
// сверху вниз и отчёт «хватает / мало / нет». Тест можно пропустить — курс тогда считает, что
// человек этого не знает.
import { useCallback, useState } from 'react';
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
import { Pill, useTheme, type Palette } from '@/shared/ui';
import {
  chainAnswer,
  chainProbe,
  priorReport,
  type ChainProbe,
  type PriorReport,
} from '@/shared/api';
import {
  areaLine,
  hasAreas,
  summaryLine,
  VERDICT_HINT,
  VERDICT_LABEL,
  verdictTone,
} from '../model/report';

type Phase = 'intro' | 'probing' | 'report';

export function PriorTestSession({ domain }: { domain: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [phase, setPhase] = useState<Phase>('intro');
  const [target, setTarget] = useState<string>('understand');
  const [probe, setProbe] = useState<ChainProbe | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [report, setReport] = useState<PriorReport | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [asked, setAsked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showReport = useCallback(
    async (fresh?: PriorReport) => {
      setProbe(null);
      setPhase('report');
      setReport(fresh ?? (await priorReport(domain, target)));
    },
    [domain, target],
  );

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await chainProbe(domain, target);
      if ('done' in result && result.done) await showReport();
      else {
        setProbe(result as ChainProbe);
        setPhase('probing');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [domain, target, showReport]);

  const skip = useCallback(async () => {
    setSkipped(true);
    setBusy(true);
    setError(null);
    try {
      await showReport();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [showReport]);

  async function submit(value: unknown) {
    if (!probe) return;
    setBusy(true);
    setError(null);
    try {
      const r = await chainAnswer(domain, target, probe.conceptId, probe.bloom, value);
      setFeedback(r.explanation);
      setAsked((n) => n + 1);
      setAnswer('');
      if (r.next) setProbe(r.next);
      else await showReport(r.report);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'intro') {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Что вы уже знаете для этой цели?</Text>
        <Text style={styles.dim}>
          Несколько вопросов по базовым областям — от самых сложных к простым. Освоенное сверху
          снимает проверку нижнего. Тест можно пропустить: тогда курс начнётся с самого начала.
        </Text>
        {MASTERY_TARGETS.map((t) => (
          <Pressable
            key={t.bloom}
            style={[styles.choice, target === t.bloom && styles.choiceOn]}
            onPress={() => setTarget(t.bloom)}
          >
            <Text style={styles.choiceLabel}>{t.short}</Text>
          </Pressable>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.btn} onPress={start} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.btnText}>Пройти тест</Text>
          )}
        </Pressable>
        <Pressable onPress={skip} disabled={busy}>
          <Text style={styles.link}>Пропустить, показать области</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (phase === 'probing' && probe) {
    const options = probe.item.options;
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.eyebrow}>
          вопрос {asked + 1} · {probe.domain} · {probe.conceptTitle}
        </Text>
        <Text style={styles.question}>{probe.item.prompt}</Text>
        {options.length > 0 ? (
          options.map((o, i) => (
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
              placeholderTextColor={colors.muted}
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
                <Text style={styles.btnText}>Ответить</Text>
              )}
            </Pressable>
          </>
        )}
        {feedback && <Text style={styles.dim}>{feedback}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={() => void showReport()} disabled={busy}>
          <Text style={styles.link}>Достаточно, покажите области</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Базовые области</Text>
      {!report ? (
        <ActivityIndicator />
      ) : !hasAreas(report) ? (
        <Text style={styles.dim}>
          Под этой целью нет отдельных базовых областей — проверять нечего.
        </Text>
      ) : (
        <>
          <Text style={styles.dim}>{summaryLine(report.summary)}</Text>
          {skipped && !report.checked && (
            <Text style={styles.warn}>
              Тест пропущен: курс исходит из того, что база не освоена.
            </Text>
          )}
          {report.areas.map((a) => (
            <View key={a.key} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                <Pill text={VERDICT_LABEL[a.verdict]} tone={verdictTone(a.verdict)} />
              </View>
              <Text style={styles.dim}>{areaLine(a)}</Text>
              <Text style={styles.dim}>{VERDICT_HINT[a.verdict]}</Text>
            </View>
          ))}
          {(report.missing?.length ?? 0) > 0 && (
            <Text style={styles.warn}>
              Не хватает в графе: {report.missing?.join(', ')}. Администратору нужно добавить
              источники по этим областям.
            </Text>
          )}
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

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
    row: { gap: 4, paddingVertical: 8 },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    rowTitle: { fontSize: 15, fontWeight: '600', color: c.ink, flexShrink: 1 },
  });
