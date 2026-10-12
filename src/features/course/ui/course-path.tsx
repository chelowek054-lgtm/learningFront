// Курс (KG5-04): путь по графу от границы знаний до цели.
// Порядок шагов задаёт backend — экран показывает его и объясняет, почему так.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { MASTERY_TARGETS, targetLabel } from '@/entities/session';
import { useModuleRegistry } from '@/shared/lib';
import { PathAccordion } from './path-accordion';
import {
  ApiError,
  buildCourse,
  completeStep,
  getCourse,
  listNotifications,
  markNotificationsRead,
  type Course,
  type CourseNotification,
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
import { draftNotice, isDraft } from '../model/draft';
import { noticesFor, noticeTone } from '../model/notices';
import { useI18n, translate } from '@/shared/i18n';

/** Каждая стадия развития объясняется пользователю, а не остаётся кодом. */
const REASON: Record<StepReason, string> = {
  get rooting() {
    return translate('courseCoursePath.1');
  },
  get differentiation() {
    return translate('courseCoursePath.2');
  },
  get branch() {
    return translate('courseCoursePath.3');
  },
  get spiral() {
    return translate('courseCoursePath.4');
  },
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
  const { t } = useI18n();
  const registry = useModuleRegistry();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [notices, setNotices] = useState<CourseNotification[]>([]);

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

  // Уведомления о курсе («готов», «дополнен»): без сети их просто нет, экран от этого не страдает.
  useEffect(() => {
    listNotifications()
      .then((all) => setNotices(noticesFor(all, domain)))
      .catch(() => setNotices([]));
  }, [domain]);

  async function dismiss(id: string) {
    setNotices((prev) => prev.filter((n) => n.id !== id));
    await markNotificationsRead([id]).catch(() => undefined);
  }

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
        <Title>{t('courseCoursePath.5')}</Title>
        <Muted>{t('courseCoursePath.6')}</Muted>
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
      <Title>{t('m.courseTitle', { target: targetLabel(course.target.bloom) })}</Title>
      <Muted>{t('courseCoursePath.7', { completed: course.completed, total: course.total })}</Muted>
      <Progress value={course.completed / Math.max(1, course.total)} />
      {notices.map((n) => (
        <Card key={n.id}>
          <Label>{n.title}</Label>
          <Note tone={noticeTone(n)}>{n.body}</Note>
          <Button
            label={t('courseCoursePath.8')}
            variant="quiet"
            onPress={() => void dismiss(n.id)}
          />
        </Card>
      ))}
      {draftNotice(course) !== '' && <Note tone="warn">{draftNotice(course)}</Note>}

      {course.current && (
        <Card tone="accent">
          <Label>{t('courseCoursePath.9')}</Label>
          <Lead>{course.current.title}</Lead>
          <Muted>
            {course.current.activities.map((a) => registry.getActivityTitle(a.type)).join(' → ')}
          </Muted>
          <Button
            label={t('courseCoursePath.10')}
            onPress={() => onStartStep(course.current!.conceptId)}
          />
          <Button
            label={t('courseCoursePath.11')}
            variant="quiet"
            onPress={() => run(() => completeStep(domain, course.current!.conceptId))}
            busy={busy}
          />
        </Card>
      )}

      {course.total === 0 && <Muted>{t('courseCoursePath.12')}</Muted>}

      <Label>{t('courseCoursePath.13')}</Label>
      <PathAccordion
        steps={course.steps}
        currentId={course.current?.conceptId ?? null}
        renderStep={(step, index) => (
          <StepRow
            key={step.conceptId}
            index={index}
            step={step}
            expanded={open === step.conceptId}
            onToggle={() => setOpen(open === step.conceptId ? null : step.conceptId)}
          />
        )}
      />

      {error && <Note tone="danger">{error}</Note>}
      <Button
        label={t('courseCoursePath.14')}
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
  const { t } = useI18n();
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
            {isDraft(step) && <Pill text={t('courseCoursePath.15')} tone="muted" />}
            <Pill
              text={step.tier === 'core' ? t('courseCoursePath.16') : t('courseCoursePath.17')}
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
