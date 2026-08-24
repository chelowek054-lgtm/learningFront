// «Сегодня» — что делать прямо сейчас: повторения, текущий шаг курса, задания.
// Навигацию по разделам забрали вкладки, поэтому здесь только работа, а не меню.
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useSession } from '@/entities/session';
import type { Activity } from '@/shared/engine';
import { ApiError, getCourse, getLocalStore, syncNow, type Course } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import {
  Body,
  Button,
  Card,
  Display,
  Empty,
  Label,
  Muted,
  Note,
  Pill,
  Progress,
  Screen,
  space,
} from '@/shared/ui';

export function HomeScreen({
  onOpenReview,
  onOpenPlacement,
  onOpenCourse,
  onOpenActivity,
}: {
  onOpenReview: () => void;
  onOpenPlacement: () => void;
  onOpenCourse: () => void;
  onOpenActivity: (a: Activity) => void;
}) {
  const { user } = useSession();
  const online = useIsOnline();
  const [dueCount, setDueCount] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [weakest, setWeakest] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const store = getLocalStore();
    if (online) {
      try {
        await syncNow(store);
      } catch {
        /* офлайн — работаем с локальными данными */
      }
      try {
        setCourse(await getCourse('ml'));
      } catch (e) {
        // 404 — курса просто нет, это не ошибка.
        if (!(e instanceof ApiError && e.status === 404)) setCourse(null);
        else setCourse(null);
      }
    }
    setDueCount((await store.listDueSrsCards(new Date().toISOString())).length);
    setActivities(await store.listActivities());

    // Адаптивный сигнал: слабейший критерий по всем оценённым ответам.
    const sums: Record<string, { s: number; n: number }> = {};
    for (const r of await store.listResponses()) {
      for (const c of r.grade?.criteria ?? []) {
        const cur = (sums[c.name] ??= { s: 0, n: 0 });
        cur.s += c.max ? c.score / c.max : 0;
        cur.n += 1;
      }
    }
    const ranked = Object.entries(sums)
      .map(([k, v]) => [k, v.s / v.n] as const)
      .sort((a, b) => a[1] - b[1]);
    setWeakest(ranked[0]?.[0] ?? null);
  }, [online]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const step = course?.current ?? null;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ gap: space.xs }}>
        <Display>Сегодня</Display>
        <Muted>
          {user?.email ?? ''} {online ? '· онлайн' : '· офлайн'}
        </Muted>
      </View>

      {/* Повторение — ежедневная привычка, поэтому первым и с числом. */}
      <Card tone={dueCount > 0 ? 'accent' : 'plain'} onPress={dueCount > 0 ? onOpenReview : undefined}>
        <Label>Повторение</Label>
        <Display>{dueCount}</Display>
        <Muted>
          {dueCount > 0 ? 'карточек ждут — интервалы уже подошли' : 'на сегодня всё повторено'}
        </Muted>
      </Card>

      {step ? (
        <Card tone="accent" onPress={onOpenCourse}>
          <Label>Текущий шаг курса</Label>
          <Body>{step.title}</Body>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Pill text={step.tier === 'core' ? 'ядро' : 'ветвь'} tone={step.tier === 'core' ? 'core' : 'muted'} />
            <Pill text={step.bloom} />
          </View>
          <Progress value={course ? course.completed / Math.max(1, course.total) : 0} />
          <Muted>
            Пройдено {course?.completed} из {course?.total}
          </Muted>
        </Card>
      ) : (
        <Card>
          <Label>Курс</Label>
          <Muted>
            Курса пока нет. Он строится от вашей границы знаний — начните с проверки уровня.
          </Muted>
          <Button label="Определить уровень" variant="quiet" onPress={onOpenPlacement} />
        </Card>
      )}

      <Label>Задания</Label>
      {activities.length === 0 ? (
        <Empty text="Пусто. Потяните вниз, чтобы синхронизировать." />
      ) : (
        activities.map((a) => (
          <Card key={a.id} onPress={() => onOpenActivity(a)}>
            <Body>{a.type}</Body>
            <Muted>
              {a.module} · {a.connectivity === 'offline' ? 'работает без сети' : 'нужна сеть'}
            </Muted>
          </Card>
        ))
      )}

      {weakest && <Note tone="warn">Слабее всего даётся: {weakest}. Стоит сфокусироваться.</Note>}
    </Screen>
  );
}
