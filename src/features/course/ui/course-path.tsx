// Курс (KG5-04): путь по графу от границы знаний до цели.
// Порядок шагов задаёт backend — экран показывает его и объясняет, почему так.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ApiError,
  buildCourse,
  completeStep,
  getCourse,
  type Course,
  type CourseStep,
  type StepReason,
} from '@/shared/api';

/** Каждая стадия развития объясняется пользователю, а не остаётся кодом. */
const REASON: Record<StepReason, string> = {
  rooting: 'фундамент',
  differentiation: 'вглубь',
  branch: 'ваш интерес',
  spiral: 'на новый уровень',
};

const ACTIVITY: Record<string, string> = {
  concept_study: 'разобрать теорию',
  concept_recall: 'вспомнить',
  concept_contrast: 'отличить от заблуждения',
  concept_apply: 'применить',
  srs: 'повторить',
};

const TARGETS = [
  { key: 'understand', label: 'Понять' },
  { key: 'apply', label: 'Применить' },
  { key: 'create', label: 'Создать' },
] as const;

export function CoursePath({ domain }: { domain: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCourse(await getCourse(domain));
    } catch (e) {
      // 404 — курса просто ещё нет, это не ошибка.
      if (!(e instanceof ApiError && e.status === 404)) setError(String(e));
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<Course>) {
    setBusy(true);
    setError(null);
    try {
      setCourse(await fn());
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.pad} />;

  if (!course) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.h1}>Курс ещё не построен</Text>
        <Text style={styles.dim}>
          Путь собирается от вашей текущей границы знаний: сначала непройденный фундамент, затем
          вглубь к цели. Выберите, до какого уровня хотите дойти.
        </Text>
        {TARGETS.map((t) => (
          <Pressable
            key={t.key}
            style={styles.btn}
            onPress={() => run(() => buildCourse(domain, t.key))}
            disabled={busy}
          >
            <Text style={styles.btnText}>{t.label}</Text>
          </Pressable>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    );
  }

  const percent = course.total ? Math.round((course.completed / course.total) * 100) : 0;

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Курс · до уровня «{course.target.bloom}»</Text>
      <Text style={styles.dim}>
        Пройдено {course.completed} из {course.total}
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>

      {course.current && (
        <View style={styles.now}>
          <Text style={styles.nowLabel}>Сейчас</Text>
          <Text style={styles.nowTitle}>{course.current.title}</Text>
          <Text style={styles.dim}>
            {course.current.activities.map((a) => ACTIVITY[a.type] ?? a.type).join(' → ')}
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => run(() => completeStep(domain, course.current!.conceptId))}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Пройдено</Text>
            )}
          </Pressable>
        </View>
      )}

      {course.total === 0 && (
        <Text style={styles.dim}>
          Идти некуда: всё, что есть в графе, уже освоено до выбранного уровня.
        </Text>
      )}

      <Text style={styles.section}>Весь путь</Text>
      {course.steps.map((step, i) => (
        <StepRow
          key={step.conceptId}
          index={i + 1}
          step={step}
          expanded={open === step.conceptId}
          onToggle={() => setOpen(open === step.conceptId ? null : step.conceptId)}
        />
      ))}

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={() => run(() => buildCourse(domain, course.target.bloom))} disabled={busy}>
        <Text style={styles.link}>Пересобрать путь по текущим знаниям</Text>
      </Pressable>
    </ScrollView>
  );
}

function StepRow({
  index,
  step,
  expanded,
  onToggle,
}: {
  index: number;
  step: CourseStep;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={[styles.step, step.done && styles.stepDone]} onPress={onToggle}>
      <View style={styles.stepHead}>
        <Text style={styles.stepNum}>{step.done ? '✓' : index}</Text>
        <View style={styles.stepMain}>
          <Text style={[styles.stepTitle, step.done && styles.struck]}>{step.title}</Text>
          <Text style={styles.dim}>
            {REASON[step.reason]} · {step.tier === 'core' ? 'ядро' : 'ветвь'} · {step.bloom}
          </Text>
        </View>
      </View>
      {expanded && (
        <View style={styles.acts}>
          {step.activities.map((a, i) => (
            <Text key={`${a.type}-${i}`} style={styles.act}>
              • {ACTIVITY[a.type] ?? a.type}
              {a.note ? ` (${a.note})` : ''}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  h1: { fontSize: 24, fontWeight: '700' },
  dim: { fontSize: 13, opacity: 0.6, lineHeight: 19 },
  error: { fontSize: 13, color: '#dc2626' },
  link: { color: '#2563eb', marginTop: 12 },
  section: { fontSize: 13, fontWeight: '700', opacity: 0.6, marginTop: 12 },
  bar: { height: 8, backgroundColor: '#8882', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 99 },
  now: {
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  nowLabel: { fontSize: 11, letterSpacing: 1, opacity: 0.6, textTransform: 'uppercase' },
  nowTitle: { fontSize: 19, fontWeight: '700' },
  step: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  stepDone: { opacity: 0.55 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { fontSize: 15, fontWeight: '700', width: 22, textAlign: 'center', opacity: 0.6 },
  stepMain: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 15, fontWeight: '500' },
  struck: { textDecorationLine: 'line-through' },
  acts: { paddingLeft: 34, gap: 3 },
  act: { fontSize: 13, opacity: 0.7 },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
