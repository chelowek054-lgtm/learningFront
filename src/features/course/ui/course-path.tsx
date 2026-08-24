// Курс (KG5-04): путь по графу от границы знаний до цели.
// Порядок шагов задаёт backend — экран показывает его и объясняет, почему так.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import {
  ApiError,
  buildCourse,
  completeStep,
  getCourse,
  type Course,
  type CourseStep,
  type StepReason,
} from '@/shared/api';
import {
  Body,
  Button,
  Card,
  Label,
  Lead,
  Muted,
  Note,
  Pill,
  Progress,
  radius,
  Screen,
  space,
  Title,
  useTheme,
} from '@/shared/ui';

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

export function CoursePath({
  domain,
  onStartStep,
}: {
  domain: string;
  /** Прохождение шага оркеструет страница: диспетчер живёт в widgets, фича его не видит. */
  onStartStep: (conceptId: string) => void;
}) {
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

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!course) {
    return (
      <Screen>
        <Title>Курс ещё не построен</Title>
        <Muted>
          Путь собирается от вашей текущей границы знаний: сначала непройденный фундамент, затем
          вглубь к цели. Выберите, до какого уровня хотите дойти.
        </Muted>
        {TARGETS.map((t) => (
          <Button
            key={t.key}
            label={t.label}
            onPress={() => run(() => buildCourse(domain, t.key))}
            busy={busy}
          />
        ))}
        {error && <Note tone="danger">{error}</Note>}
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Курс · до уровня «{course.target.bloom}»</Title>
      <Muted>
        Пройдено {course.completed} из {course.total}
      </Muted>
      <Progress value={course.completed / Math.max(1, course.total)} />

      {course.current && (
        <Card tone="accent">
          <Label>Сейчас</Label>
          <Lead>{course.current.title}</Lead>
          <Muted>
            {course.current.activities.map((a) => ACTIVITY[a.type] ?? a.type).join(' → ')}
          </Muted>
          <Button label="Начать" onPress={() => onStartStep(course.current!.conceptId)} />
          <Button
            label="Уже знаю, пропустить"
            variant="quiet"
            onPress={() => run(() => completeStep(domain, course.current!.conceptId))}
            busy={busy}
          />
        </Card>
      )}

      {course.total === 0 && (
        <Muted>Идти некуда: всё, что есть в графе, уже освоено до выбранного уровня.</Muted>
      )}

      <Label>Весь путь</Label>
      {course.steps.map((step, i) => (
        <StepRow
          key={step.conceptId}
          index={i + 1}
          step={step}
          expanded={open === step.conceptId}
          onToggle={() => setOpen(open === step.conceptId ? null : step.conceptId)}
        />
      ))}

      {error && <Note tone="danger">{error}</Note>}
      <Button
        label="Пересобрать путь по текущим знаниям"
        variant="quiet"
        onPress={() => run(() => buildCourse(domain, course.target.bloom))}
        busy={busy}
      />
    </Screen>
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
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.line,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: space.md,
        gap: space.sm,
        opacity: step.done ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: step.done ? colors.accent : colors.surfaceAlt,
          }}
        >
          <Body>{step.done ? '✓' : String(index)}</Body>
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Body>{step.title}</Body>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Pill text={REASON[step.reason]} />
            <Pill
              text={step.tier === 'core' ? 'ядро' : 'ветвь'}
              tone={step.tier === 'core' ? 'core' : 'muted'}
            />
            <Pill text={step.bloom} />
          </View>
        </View>
      </View>
      {expanded && (
        <View style={{ paddingLeft: space.xxl + space.sm, gap: space.xs }}>
          {step.activities.map((a, i) => (
            <Muted key={`${a.type}-${i}`}>
              • {ACTIVITY[a.type] ?? a.type}
              {a.note ? ` (${a.note})` : ''}
            </Muted>
          ))}
        </View>
      )}
    </Pressable>
  );
}
