// Экран прогресса (T-0009, AC-12.7): удержание, рост по рубрикам, закрытие ошибок,
// граница знаний и регулярность. Метрики считаются на устройстве из event log,
// поэтому экран работает офлайн; карта знаний — единственное, что требует сети.
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  errorLogClosure,
  isEmptyProgress,
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
import {
  Body,
  Card,
  Display,
  Label,
  Lead,
  Muted,
  Pill,
  Progress,
  Screen,
  Title,
  TopBar,
} from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

interface Snapshot {
  retention: Retention;
  closure: ErrorLogClosure;
  growth: RubricGrowth[];
  streak: number;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}`;

export function ProgressScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
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
      <TopBar title={t('progressProgressScreen.1')} onBack={onBack} />

      {isEmptyProgress(snap, known) && (
        <Card tone="accent">
          <Label>{t('progressProgressScreen.2')}</Label>
          <Title>{t('progressProgressScreen.3')}</Title>
          <Muted>{t('progressProgressScreen.4')}</Muted>
        </Card>
      )}

      <Card>
        <Label>{t('progressProgressScreen.5')}</Label>
        {mapState === 'loading' && <ActivityIndicator />}
        {mapState === 'unavailable' && <Muted>{t('progressProgressScreen.6')}</Muted>}
        {mapState === 'ready' && !known && <Muted>{t('progressProgressScreen.7')}</Muted>}
        {mapState === 'ready' && known && (
          <>
            <Display>
              {t('progressProgressScreen.8', { known: known.known, total: known.total })}
            </Display>
            <Muted>{t('progressProgressScreen.9')}</Muted>
            <Progress value={known.rate} tone="core" />
          </>
        )}
      </Card>

      <Card>
        <Label>{t('progressProgressScreen.10')}</Label>
        {snap.retention.rate === null ? (
          <Muted>{t('progressProgressScreen.11')}</Muted>
        ) : (
          <>
            <Lead>{pct(snap.retention.rate)} повторений без срыва</Lead>
            <Progress value={snap.retention.rate} />
            <Muted>
              {t('progressProgressScreen.12', {
                reviews: snap.retention.reviews,
                lapses: snap.retention.lapses,
              })}
              {t('progressProgressScreen.13')}
            </Muted>
          </>
        )}
      </Card>

      <Card>
        <Label>{t('progressProgressScreen.14')}</Label>
        {snap.closure.rate === null ? (
          <Muted>{t('progressProgressScreen.15')}</Muted>
        ) : (
          <>
            <Lead>
              {t('progressProgressScreen.16', {
                settled: snap.closure.settled,
                total: snap.closure.total,
              })}
            </Lead>
            <Progress value={snap.closure.rate} />
            <Muted>{t('progressProgressScreen.17')}</Muted>
          </>
        )}
      </Card>

      <Card>
        <Label>{t('progressProgressScreen.18')}</Label>
        {snap.growth.length === 0 && <Muted>{t('progressProgressScreen.19')}</Muted>}
        {snap.growth.map((g) => (
          <GrowthRow key={g.rubricId} growth={g} />
        ))}
      </Card>

      <Card>
        <Label>{t('progressProgressScreen.20')}</Label>
        {snap.streak > 0 && (
          <Pill
            text={`${snap.streak} ${plural(snap.streak, ['день', 'дня', 'дней'])} подряд`}
            tone="accent"
          />
        )}
        <Lead>
          {snap.streak > 0
            ? `Серия: ${snap.streak} ${plural(snap.streak, ['день', 'дня', 'дней'])} подряд`
            : t('progressProgressScreen.21')}
        </Lead>
      </Card>
    </Screen>
  );
}

function GrowthRow({ growth }: { growth: RubricGrowth }) {
  const { t } = useI18n();
  return (
    <>
      <Body>
        {rubricTitle(growth.rubricId)} · работ: {growth.count}
      </Body>
      {growth.delta === null ? (
        <Muted>
          {growth.last !== null ? t('progressProgressScreen.22', { last: growth.last }) : ''}
          Динамика появится после второй
          {t('progressProgressScreen.23')}
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
