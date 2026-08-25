// Курс (KG5-04): путь по графу от границы знаний до цели.
// Порядок шагов задаёт backend — экран показывает его и объясняет, почему так.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { MASTERY_TARGETS, targetLabel } from '@/entities/session';
import { useModuleRegistry } from '@/shared/lib';
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

// Названия активностей и уровней держит не этот экран: они жили здесь, в
// course-screen и в home одновременно и успели разойтись. Источники —
// ActivityTypeDef (через реестр) и MASTERY_TARGETS.

export function CoursePath({
  domain,
  onStartStep,
}: {
  domain: string;
  /** Прохождение шага оркеструет страница: диспетчер живёт в widgets, фича его не видит. */
  onStartStep: (conceptId: string) => void;
}) {
  const registry = useModuleRegistry();
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
        {MASTERY_TARGETS.map((t) => (
          <Button
            key={t.bloom}
            label={t.label}
            onPress={() => run(() => buildCourse(domain, t.bloom))}
            busy={busy}
          />
        ))}
        {error && <Note tone="danger">{error}</Note>}
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Курс · чтобы {targetLabel(course.target.bloom)}</Title>
      <Muted>
        Пройдено {course.completed} из {course.total}
      </Muted>
      <Progress value={course.completed / Math.max(1, course.total)} />

      {course.current && (
        <Card tone="accent">
          <Label>Сейчас</Label>
          <Lead>{course.current.title}</Lead>
          <Muted>
            {course.current.activities.map((a) => registry.getActivityTitle(a.type)).join(' → ')}
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
  const registry = useModuleRegistry();
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
              text={step.tier === 'core' ? 'Основа' : 'Ответвление'}
              tone={step.tier === 'core' ? 'core' : 'muted'}
            />
          </View>
        </View>
      </View>
      {expanded && (
        <View style={{ paddingLeft: space.xxl + space.sm, gap: space.xs }}>
          {step.activities.map((a, i) => (
            <Muted key={`${a.type}-${i}`}>
              • {registry.getActivityTitle(a.type)}
              {a.note ? ` (${a.note})` : ''}
            </Muted>
          ))}
        </View>
      )}
    </Pressable>
  );
}
