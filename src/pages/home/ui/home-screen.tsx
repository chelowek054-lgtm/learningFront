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
        <Display>Сегодня</Display>
        <Muted>
          {subject ? subject.title : (user?.email ?? '')} {online ? '· онлайн' : '· офлайн'}
        </Muted>
        {onOpenLibrary && (
          <Pressable onPress={onOpenLibrary}>
            <Muted>Моя библиотека →</Muted>
          </Pressable>
        )}
      </View>

      {!online && subject && (
        <Card>
          <Label>Нет сети</Label>
          <Muted>
            Показано последнее известное состояние. Скачанные шаги и повторение работают.
          </Muted>
        </Card>
      )}

      {action.kind === 'subject' && (
        <StateHero
          label="Начало"
          title="Что хотите изучить?"
          reason="Назовите навык, предмет или язык — составим путь за три минуты."
          primary={onOpenLibrary ? { label: 'Начать', onPress: onOpenLibrary } : undefined}
          big
        />
      )}

      {action.kind === 'goal' && (
        <StateHero
          label="Следующий шаг"
          badge={{ text: 'цель', tone: 'accent' }}
          title="Закончить постановку цели"
          reason={action.reason}
          primary={onOpenLibrary ? { label: 'Продолжить', onPress: onOpenLibrary } : undefined}
        />
      )}

      {action.kind === 'paused' && (
        <StateHero
          tone="plain"
          label="Предмет на паузе"
          title="Вы отложили его"
          reason={action.reason}
          primary={
            onOpenLibrary ? { label: 'Открыть библиотеку', onPress: onOpenLibrary } : undefined
          }
        />
      )}

      {action.kind === 'outline' && (
        <StateHero
          label="Состав навыка готов"
          badge={{ text: 'ждёт вас', tone: 'info' }}
          title="Проверьте состав и соберите карту"
          reason={action.reason}
          primary={{ label: 'Проверить и собрать карту', onPress: onOpenSkillProfile }}
        />
      )}

      {action.kind === 'building' && (
        <StateHero
          label={`Карта собирается · ${elapsedLabel(action.minutes)}`}
          badge={{ text: 'в работе', tone: 'info' }}
          title="Собираем вашу карту"
          reason={action.reason}
          primary={{ label: 'Посмотреть ход сборки', onPress: onOpenGraph }}
        />
      )}

      {action.kind === 'failed' && (
        <StateHero
          tone="plain"
          label="Сборка не завершилась"
          badge={{ text: action.interrupted ? 'прервана' : 'сбой', tone: 'danger' }}
          title="Карту нужно собрать заново"
          reason={action.reason}
          primary={{ label: 'Запустить заново', onPress: () => void restart(), busy: restarting }}
        />
      )}

      {action.kind === 'build' && (
        <StateHero
          label="Карта не построена"
          title="Карты ещё нет"
          reason={action.reason}
          primary={{ label: 'Построить карту', onPress: () => void restart(), busy: restarting }}
        />
      )}

      {action.kind === 'course' && (
        <StateHero
          label="Следующий шаг"
          title={action.step.title}
          reason={action.reason}
          primary={{ label: 'Начать шаг', onPress: onOpenCourse }}
        >
          <Progress value={course ? course.completed / Math.max(1, course.total) : 0} />
          <Muted>
            Пройдено {course?.completed} из {course?.total}
          </Muted>
        </StateHero>
      )}

      {action.kind === 'review' && (
        <StateHero
          label="Повторение"
          title={`${action.dueCount} ${cardsWord(action.dueCount)}`}
          reason={action.reason}
          primary={{ label: 'Повторить', onPress: onOpenReview }}
          big
        />
      )}

      {action.kind === 'placement' && (
        <StateHero
          label="Следующий шаг"
          title="Определить уровень"
          reason={action.reason}
          primary={{ label: 'Начать', onPress: onOpenPlacement }}
        />
      )}

      {action.kind === 'done' && <GoalReachedCard onAddArea={onOpenSkillProfile} />}

      {action.kind === 'loading' && (
        <StateHero tone="plain" label="Загрузка" title="Загружаем состояние предмета…" />
      )}

      {subject && (
        <TodayTiles
          tiles={[
            {
              id: 'review',
              title: 'Повторение',
              text:
                dueCount > 0 ? `Карточек к повторению: ${dueCount}` : 'На сегодня всё повторено',
              onPress: onOpenReview,
            },
            {
              id: 'done',
              title: 'Освоено',
              text: course
                ? `Пройдено ${course.completed} из ${course.total}`
                : stale && lastKnown
                  ? `Пройдено ${lastKnown.completed} из ${lastKnown.total} (последнее известное, нет связи)`
                  : 'Курс ещё не начат',
              onPress: onOpenCourse,
            },
            {
              id: 'weak',
              title: 'Слабые места',
              text:
                weak === null
                  ? 'Появятся после первых ответов'
                  : weak === 0
                    ? 'Слабых мест пока нет'
                    : `Понятий, к которым стоит вернуться: ${weak}`,
              onPress: onOpenCourse,
            },
            {
              id: 'level',
              title: 'Проверка уровня',
              text: 'Определить, что вы уже знаете',
              onPress: onOpenPlacement,
            },
            {
              id: 'reading',
              title: 'Читать дальше',
              text: 'Ваши материалы по фрагментам',
              onPress: onOpenMaterials,
            },
            {
              id: 'goal',
              title: 'Цель',
              text: `${subject.title}: ${subject.target}`,
              onPress: onOpenLibrary,
            },
          ]}
        />
      )}

      {/* Вторичное — одной спокойной строкой, чтобы не превратиться в список. */}
      {action.kind !== 'review' && dueCount > 0 && (
        <Note tone="muted">Ещё {dueCount} карточек ждут повторения — можно после шага.</Note>
      )}
    </Screen>
  );
}
