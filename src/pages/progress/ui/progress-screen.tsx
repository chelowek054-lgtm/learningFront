// Экран прогресса (T-0009, AC-12.7): удержание, рост по рубрикам, закрытие ошибок,
// граница знаний и регулярность. Метрики считаются на устройстве из event log,
// поэтому экран работает офлайн; карта знаний — единственное, что требует сети.
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  errorLogClosure,
  knownShare,
  retention,
  rubricGrowth,
  rubricTitle,
  streakDays,
  type ErrorLogClosure,
  type KnownShare,
  type Retention,
  type RubricGrowth,
} from '@/entities/progress';
import { useSession } from '@/entities/session';
import { getLocalStore, masteryMap } from '@/shared/api';
import { Body, Card, Label, Lead, Muted, Progress, Screen, TopBar } from '@/shared/ui';

interface Snapshot {
  retention: Retention;
  closure: ErrorLogClosure;
  growth: RubricGrowth[];
  streak: number;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}`;

export function ProgressScreen({ onBack }: { onBack?: () => void }) {
  const { subject } = useSession();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [known, setKnown] = useState<KnownShare | null>(null);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let alive = true;
    const store = getLocalStore();
    void Promise.all([store.listResponses(), store.listSrsCards()]).then(([responses, cards]) => {
      if (!alive) return;
      setSnap({
        retention: retention(cards),
        closure: errorLogClosure(cards),
        growth: rubricGrowth(responses),
        streak: streakDays(responses),
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Карта знаний живёт на сервере; без сети или без предмета показываем это прямо.
  useEffect(() => {
    let alive = true;
    if (!subject) {
      setMapState('unavailable');
      return;
    }
    masteryMap(subject.id)
      .then((m) => {
        if (!alive) return;
        setKnown(knownShare(m));
        setMapState('ready');
      })
      .catch(() => alive && setMapState('unavailable'));
    return () => {
      alive = false;
    };
  }, [subject]);

  if (!snap) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Прогресс" onBack={onBack} />

      <Card>
        <Label>Граница знаний</Label>
        {mapState === 'loading' && <ActivityIndicator />}
        {mapState === 'unavailable' && (
          <Muted>Карта знаний недоступна: нужна сеть и выбранный предмет.</Muted>
        )}
        {mapState === 'ready' && !known && <Muted>В графе пока нет тем.</Muted>}
        {mapState === 'ready' && known && (
          <>
            <Lead>
              Освоено {known.known} из {known.total} тем
            </Lead>
            <Progress value={known.rate} tone="core" />
          </>
        )}
      </Card>

      <Card>
        <Label>Удержание</Label>
        {snap.retention.rate === null ? (
          <Muted>Повторений ещё не было — карточки появятся после первых шагов курса.</Muted>
        ) : (
          <>
            <Lead>{pct(snap.retention.rate)} повторений без срыва</Lead>
            <Progress value={snap.retention.rate} />
            <Muted>
              Повторений: {snap.retention.reviews}, срывов: {snap.retention.lapses}. Это итог за всё
              время.
            </Muted>
          </>
        )}
      </Card>

      <Card>
        <Label>Закрытие ошибок</Label>
        {snap.closure.rate === null ? (
          <Muted>Карточек из ошибок пока нет.</Muted>
        ) : (
          <>
            <Lead>
              Закреплено {snap.closure.settled} из {snap.closure.total}
            </Lead>
            <Progress value={snap.closure.rate} />
            <Muted>Закреплённая — та, что вышла из обучения и повторена минимум дважды.</Muted>
          </>
        )}
      </Card>

      <Card>
        <Label>Рост по рубрикам</Label>
        {snap.growth.length === 0 && <Muted>Оценённых работ пока нет.</Muted>}
        {snap.growth.map((g) => (
          <GrowthRow key={g.rubricId} growth={g} />
        ))}
      </Card>

      <Card>
        <Label>Регулярность</Label>
        <Lead>
          {snap.streak > 0
            ? `Серия: ${snap.streak} ${plural(snap.streak, ['день', 'дня', 'дней'])} подряд`
            : 'Серии нет — позаниматься можно сегодня'}
        </Lead>
      </Card>
    </Screen>
  );
}

function GrowthRow({ growth }: { growth: RubricGrowth }) {
  return (
    <>
      <Body>
        {rubricTitle(growth.rubricId)} · работ: {growth.count}
      </Body>
      {growth.delta === null ? (
        <Muted>
          {growth.last !== null ? `Балл ${growth.last}. ` : ''}Динамика появится после второй
          работы.
        </Muted>
      ) : (
        <Muted>
          {growth.first} → {growth.last} ({signed(growth.delta)})
        </Muted>
      )}
      {growth.criteria.map((c) => (
        <Muted key={c.name}>
          {c.name}: {Math.round(c.first * 10) / 10} → {Math.round(c.last * 10) / 10} (
          {signed(c.delta)})
        </Muted>
      ))}
    </>
  );
}

/** Склонение по числу: 1 день, 2 дня, 5 дней. */
function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}
