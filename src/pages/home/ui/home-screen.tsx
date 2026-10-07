// «Сегодня» — одно следующее действие с причиной под ним.
//
// Прежде здесь было три конкурирующих списка, и связь между ними нигде не
// объяснялась. Плюс задания выводились слугами типов (`concept_recall`) с
// подписью про доступность сети — то есть экран отвечал на вопрос «в каком
// состоянии система», а человек пришёл с вопросом «что мне делать».
// Сырой список переехал в служебный экран (профиль → «Разработчику»).
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { useSession } from '@/entities/session';
import { GoalReachedCard } from '@/features/goal-reached';
import { elapsedLabel, isPending, POLL_MS } from '@/features/graph-editor';
import {
  ApiError,
  getCourse,
  getGraph,
  getLocalStore,
  getProfile,
  startGraphBuild,
  syncNow,
  type Course,
  type ProfileState,
} from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import {
  Body,
  Button,
  Card,
  Display,
  Label,
  Muted,
  Note,
  Progress,
  Screen,
  space,
} from '@/shared/ui';

import { nextAction } from '../model/next-action';

export function HomeScreen({
  onOpenReview,
  onOpenPlacement,
  onOpenCourse,
  onOpenGraph,
  onOpenSkillProfile,
}: {
  onOpenReview: () => void;
  onOpenPlacement: () => void;
  onOpenCourse: () => void;
  onOpenGraph: () => void;
  onOpenSkillProfile: () => void;
}) {
  const { user, subject } = useSession();
  const online = useIsOnline();
  const [dueCount, setDueCount] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [build, setBuild] = useState<ProfileState | null>(null);
  const [graphSize, setGraphSize] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [restarting, setRestarting] = useState(false);
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
        setCourse(await getCourse(subject.id));
      } catch (e) {
        // 404 — курса просто нет, это не ошибка.
        if (!(e instanceof ApiError && e.status === 404)) setCourse(null);
        else setCourse(null);
      }
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
      setBuild(await startGraphBuild(subject.id));
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
  });

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ gap: space.xs }}>
        <Display>Сегодня</Display>
        <Muted>
          {subject ? subject.title : (user?.email ?? '')} {online ? '· онлайн' : '· офлайн'}
        </Muted>
      </View>

      {action.kind === 'course' && (
        <Card tone="accent" onPress={onOpenCourse}>
          <Label>Следующий шаг</Label>
          <Body>{action.step.title}</Body>
          <Muted>{action.reason}</Muted>
          <Progress value={course ? course.completed / Math.max(1, course.total) : 0} />
          <Muted>
            Пройдено {course?.completed} из {course?.total}
          </Muted>
        </Card>
      )}

      {action.kind === 'review' && (
        <Card tone="accent" onPress={onOpenReview}>
          <Label>Следующий шаг</Label>
          <Body>Повторение · {action.dueCount}</Body>
          <Muted>{action.reason}</Muted>
        </Card>
      )}

      {action.kind === 'placement' && (
        <Card>
          <Label>Следующий шаг</Label>
          <Body>Определить уровень</Body>
          <Muted>{action.reason}</Muted>
          <Button label="Начать" variant="quiet" onPress={onOpenPlacement} />
        </Card>
      )}

      {action.kind === 'building' && (
        <Card tone="accent" onPress={onOpenGraph}>
          <Label>Карта собирается · {elapsedLabel(action.minutes)}</Label>
          <Muted>{action.reason}</Muted>
        </Card>
      )}

      {action.kind === 'failed' && (
        <Card>
          <Label>Сборка не завершилась</Label>
          <Muted>{action.reason}</Muted>
          <Button label="Запустить заново" onPress={() => void restart()} busy={restarting} />
        </Card>
      )}

      {action.kind === 'outline' && (
        <Card tone="accent" onPress={onOpenSkillProfile}>
          <Label>Следующий шаг</Label>
          <Body>Проверить состав навыка</Body>
          <Muted>{action.reason}</Muted>
        </Card>
      )}

      {action.kind === 'build' && (
        <Card>
          <Label>Следующий шаг</Label>
          <Body>Собрать карту знаний</Body>
          <Muted>{action.reason}</Muted>
          <Button label="Собрать" onPress={() => void restart()} busy={restarting} />
        </Card>
      )}

      {action.kind === 'done' && <GoalReachedCard onAddArea={onOpenSkillProfile} />}

      {action.kind === 'subject' && (
        <Card>
          <Label>Следующий шаг</Label>
          <Body>Выбрать предмет</Body>
          <Muted>{action.reason}</Muted>
        </Card>
      )}

      {/* Вторичное — одной спокойной строкой, чтобы не превратиться в список. */}
      {action.kind !== 'review' && dueCount > 0 && (
        <Note tone="muted">Ещё {dueCount} карточек ждут повторения — можно после шага.</Note>
      )}
    </Screen>
  );
}
