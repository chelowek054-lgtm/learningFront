// «Сегодня» — одно следующее действие с причиной под ним.
//
// Прежде здесь было три конкурирующих списка, и связь между ними нигде не
// объяснялась. Плюс задания выводились слугами типов (`concept_recall`) с
// подписью про доступность сети — то есть экран отвечал на вопрос «в каком
// состоянии система», а человек пришёл с вопросом «что мне делать».
// Сырой список переехал в служебный экран (профиль → «Разработчику»).
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { rememberedText, rememberText } from '@/shared/lib';

import { useSession } from '@/entities/session';
import { GoalReachedCard } from '@/features/goal-reached';
import { canResume, elapsedLabel, isPending, POLL_MS } from '@/features/graph-editor';
import {
  ApiError,
  getCourse,
  getGoalIntake,
  getGraph,
  getLocalStore,
  fillGraph,
  getProfile,
  listSubjects,
  weakNodes,
  startGraphBuild,
  syncNow,
  type Course,
  type ProfileState,
} from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import { Card, Display, Label, Muted, Note, Progress, Screen, space } from '@/shared/ui';

import { cardsWord, nextAction } from '../model/next-action';
import { StateHero } from './state-hero';
import { TodayTiles } from './today-tiles';
import { useI18n } from '@/shared/i18n';

export function HomeScreen({
  onOpenReview,
  onOpenPlacement,
  onOpenCourse,
  onOpenGraph,
  onOpenSkillProfile,
  onOpenLibrary,
  onOpenMaterials,
}: {
  onOpenReview: () => void;
  onOpenPlacement: () => void;
  onOpenCourse: () => void;
  onOpenGraph: () => void;
  onOpenSkillProfile: () => void;
  onOpenLibrary?: () => void;
  onOpenMaterials?: () => void;
}) {
  const { t } = useI18n();
  const { user, subject } = useSession();
  const online = useIsOnline();
  const [dueCount, setDueCount] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [build, setBuild] = useState<ProfileState | null>(null);
  const [graphSize, setGraphSize] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [restarting, setRestarting] = useState(false);
  const [weak, setWeak] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [goalPending, setGoalPending] = useState(false);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const store = getLocalStore();
    if (online && subject) {
      try {
        await syncNow(store);
      } catch {
        /* офлайн — работаем с локальными данными */
      }
      try {
        const fresh = await getCourse(subject.id);
        setCourse(fresh);
        setStale(false);
        rememberText(
          `course-last:${subject.id}`,
          JSON.stringify({ completed: fresh.completed, total: fresh.total }),
        );
      } catch (e) {
        // 404 — курса просто нет, это не ошибка; иное — нет связи: показываем последнее известное с пометкой.
        if (e instanceof ApiError && e.status === 404) {
          setCourse(null);
          setStale(false);
        } else {
          setStale(rememberedText(`course-last:${subject.id}`) !== null);
        }
      }
      setWeak(
        await weakNodes(subject.id).then(
          (w) => w.length,
          () => null,
        ),
      );
      setPaused(
        await listSubjects().then(
          (list) => list.some((s) => s.domain === subject.id && s.status === 'paused'),
          () => false,
        ),
      );
      // Цель ставится, пока она не подтверждена; нет связи — не блокируем «Сегодня» по неизвестности.
      setGoalPending(
        await getGoalIntake(subject.id).then(
          (g) => !g.confirmed,
          () => false,
        ),
      );
      // Состояние сборки карты: без него «Сегодня» путало «карта собирается» с «уровень неизвестен».
      setBuild(await getProfile(subject.id).catch(() => null));
      setGraphSize(
        await getGraph(subject.id).then(
          (g) => g.nodes.length,
          () => null,
        ),
      );
      setNow(Date.now());
    }
    setDueCount((await store.listDueSrsCards(new Date().toISOString())).length);
  }, [online, subject]);

  useEffect(() => {
    void load();
  }, [load]);

  // Пока карта собирается, спрашиваем статус сами: готовность не должна ждать ручного обновления.
  const pending = isPending(build);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [pending, load]);

  async function restart() {
    if (!subject) return;
    setRestarting(true);
    try {
      // Контур уже есть — продолжаем наполнение, а не начинаем с нуля.
      setBuild(await (canResume(build) ? fillGraph(subject.id) : startGraphBuild(subject.id)));
      setNow(Date.now());
    } finally {
      setRestarting(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const action = nextAction({
    hasSubject: Boolean(subject),
    course,
    dueCount,
    build,
    graphSize,
    now,
    paused,
    // Старые цели без подтверждения не должны прятать готовый путь: «ставится» — только пока пути ещё нет.
    goalPending: goalPending && !course,
  });

  // Нет связи: «освоено» берём из последнего известного состояния и говорим об этом.
  const lastKnown = (() => {
    try {
      const raw = subject ? rememberedText(`course-last:${subject.id}`) : null;
      return raw ? (JSON.parse(raw) as { completed: number; total: number }) : null;
    } catch {
      return null;
    }
  })();

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ gap: space.xs }}>
        <Display>{t('home.21')}</Display>
        <Muted>
          {subject ? subject.title : (user?.email ?? '')} {online ? t('home.22') : t('home.23')}
        </Muted>
        {onOpenLibrary && (
          <Pressable onPress={onOpenLibrary}>
            <Muted>{t('home.24')}</Muted>
          </Pressable>
        )}
      </View>

      {!online && subject && (
        <Card>
          <Label>{t('home.25')}</Label>
          <Muted>{t('home.26')}</Muted>
        </Card>
      )}

      {action.kind === 'subject' && (
        <StateHero
          label={t('home.27')}
          title={t('home.28')}
          reason={t('home.29')}
          primary={onOpenLibrary ? { label: t('home.30'), onPress: onOpenLibrary } : undefined}
          big
        />
      )}

      {action.kind === 'goal' && (
        <StateHero
          label={t('home.31')}
          badge={{ text: t('home.32'), tone: 'accent' }}
          title={t('home.33')}
          reason={action.reason}
          primary={onOpenLibrary ? { label: t('home.34'), onPress: onOpenLibrary } : undefined}
        />
      )}

      {action.kind === 'paused' && (
        <StateHero
          tone="plain"
          label={t('home.35')}
          title={t('home.36')}
          reason={action.reason}
          primary={onOpenLibrary ? { label: t('home.37'), onPress: onOpenLibrary } : undefined}
        />
      )}

      {action.kind === 'outline' && (
        <StateHero
          label={t('home.38')}
          badge={{ text: t('home.39'), tone: 'info' }}
          title={t('home.40')}
          reason={action.reason}
          primary={{ label: t('home.41'), onPress: onOpenSkillProfile }}
        />
      )}

      {action.kind === 'building' && (
        <StateHero
          label={t('home.building', { elapsed: elapsedLabel(action.minutes) })}
          badge={{ text: t('home.42'), tone: 'info' }}
          title={t('home.43')}
          reason={action.reason}
          primary={{ label: t('home.44'), onPress: onOpenGraph }}
        />
      )}

      {action.kind === 'failed' && (
        <StateHero
          tone="plain"
          label={t('home.45')}
          badge={{ text: action.interrupted ? t('home.46') : t('home.47'), tone: 'danger' }}
          title={t('home.48')}
          reason={action.reason}
          primary={{ label: t('home.49'), onPress: () => void restart(), busy: restarting }}
        />
      )}

      {action.kind === 'build' && (
        <StateHero
          label={t('home.50')}
          title={t('home.51')}
          reason={action.reason}
          primary={{ label: t('home.52'), onPress: () => void restart(), busy: restarting }}
        />
      )}

      {action.kind === 'course' && (
        <StateHero
          label={t('home.31')}
          title={action.step.title}
          reason={action.reason}
          primary={{ label: t('home.53'), onPress: onOpenCourse }}
        >
          <Progress value={course ? course.completed / Math.max(1, course.total) : 0} />
          <Muted>
            {t('home.54', { completed: course?.completed ?? 0, total: course?.total ?? 0 })}
          </Muted>
        </StateHero>
      )}

      {action.kind === 'review' && (
        <StateHero
          label={t('home.55')}
          title={`${action.dueCount} ${cardsWord(action.dueCount)}`}
          reason={action.reason}
          primary={{ label: t('home.56'), onPress: onOpenReview }}
          big
        />
      )}

      {action.kind === 'placement' && (
        <StateHero
          label={t('home.31')}
          title={t('home.57')}
          reason={action.reason}
          primary={{ label: t('home.30'), onPress: onOpenPlacement }}
        />
      )}

      {action.kind === 'done' && <GoalReachedCard onAddArea={onOpenSkillProfile} />}

      {action.kind === 'loading' && (
        <StateHero tone="plain" label={t('home.58')} title={t('home.15')} />
      )}

      {subject && (
        <TodayTiles
          tiles={[
            {
              id: 'review',
              title: t('home.55'),
              text: dueCount > 0 ? t('home.59', { dueCount }) : t('home.60'),
              onPress: onOpenReview,
            },
            {
              id: 'done',
              title: t('home.61'),
              text: course
                ? t('home.54', { completed: course.completed, total: course.total })
                : stale && lastKnown
                  ? t('home.62', { completed: lastKnown.completed, total: lastKnown.total })
                  : t('home.63'),
              onPress: onOpenCourse,
            },
            {
              id: 'weak',
              title: t('home.64'),
              text:
                weak === null ? t('home.65') : weak === 0 ? t('home.66') : t('home.67', { weak }),
              onPress: onOpenCourse,
            },
            {
              id: 'level',
              title: t('home.68'),
              text: t('home.69'),
              onPress: onOpenPlacement,
            },
            {
              id: 'reading',
              title: t('home.70'),
              text: t('home.71'),
              onPress: onOpenMaterials,
            },
            {
              id: 'goal',
              title: t('home.72'),
              text: `${subject.title}: ${subject.target}`,
              onPress: onOpenLibrary,
            },
          ]}
        />
      )}

      {/* Вторичное — одной спокойной строкой, чтобы не превратиться в список. */}
      {action.kind !== 'review' && dueCount > 0 && (
        <Note tone="muted">{t('home.73', { dueCount })}</Note>
      )}
    </Screen>
  );
}
