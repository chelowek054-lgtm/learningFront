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
import { ApiError, getCourse, getLocalStore, syncNow, type Course } from '@/shared/api';
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
}: {
  onOpenReview: () => void;
  onOpenPlacement: () => void;
  onOpenCourse: () => void;
}) {
  const { user, subject } = useSession();
  const online = useIsOnline();
  const [dueCount, setDueCount] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
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
    }
    setDueCount((await store.listDueSrsCards(new Date().toISOString())).length);
  }, [online, subject]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const action = nextAction({ hasSubject: Boolean(subject), course, dueCount });

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
