// Экран интервального повторения (WS6): очередь due-карточек + FSRS.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, type Palette } from '@/shared/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createScheduler,
  type FsrsCardState,
  type Rating,
  type SrsCardRecord,
} from '@/shared/engine';
import { getLocalStore } from '@/shared/api';

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];
const RATING_LABEL: Record<Rating, string> = {
  again: 'Снова',
  hard: 'Трудно',
  good: 'Хорошо',
  easy: 'Легко',
};

function reviveCard(state: Record<string, unknown>, now: Date): FsrsCardState {
  if (!state.due) return createScheduler().createCard(now);
  return {
    ...state,
    due: new Date(String(state.due)),
    last_review: state.last_review ? new Date(String(state.last_review)) : undefined,
  } as unknown as FsrsCardState;
}

function serializeCard(card: FsrsCardState): Record<string, unknown> {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  } as unknown as Record<string, unknown>;
}

function frontText(c: SrsCardRecord): string {
  const f = c.front as { word?: string; prompt?: string };
  return f.word ?? f.prompt ?? JSON.stringify(c.front);
}
function backText(c: SrsCardRecord): string {
  const b = c.back as { definition?: string; correction?: string; explanation?: string };
  return (
    b.definition ??
    [b.correction, b.explanation].filter(Boolean).join(' — ') ??
    JSON.stringify(c.back)
  );
}

export function ReviewScreen({ onDone }: { onDone?: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scheduler = useMemo(() => createScheduler(), []);
  const [queue, setQueue] = useState<SrsCardRecord[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const store = getLocalStore();
    setQueue(await store.listDueSrsCards(new Date().toISOString()));
    setRevealed(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function rate(rating: Rating) {
    const card = queue[0];
    if (!card) return;
    const now = new Date();
    const { card: next, dueAt } = scheduler.review(reviveCard(card.fsrsState, now), rating, now);
    await getLocalStore().upsertSrsCard({
      ...card,
      fsrsState: serializeCard(next),
      dueAt: dueAt.toISOString(),
    });
    setQueue((q) => q.slice(1));
    setRevealed(false);
  }

  if (loading) return null;

  const card = queue[0];
  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.done}>Повторения на сегодня сделаны 🎉</Text>
          {onDone && (
            <Pressable onPress={onDone}>
              <Text style={styles.link}>← На главную</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.counter}>Осталось: {queue.length}</Text>
        <Pressable style={styles.card} onPress={() => setRevealed(true)}>
          <Text style={styles.front}>{frontText(card)}</Text>
          {revealed && <Text style={styles.back}>{backText(card)}</Text>}
          {!revealed && <Text style={styles.hint}>нажмите, чтобы показать ответ</Text>}
        </Pressable>

        {revealed && (
          <View style={styles.ratings}>
            {RATINGS.map((r) => (
              <Pressable key={r} style={styles.rateBtn} onPress={() => rate(r)}>
                <Text style={styles.rateText}>{RATING_LABEL[r]}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    content: { flex: 1, padding: 16, gap: 16 },
    counter: { fontSize: 13, color: c.muted },
    card: {
      minHeight: 180,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    front: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: c.ink },
    back: { fontSize: 17, textAlign: 'center', color: c.muted },
    hint: { fontSize: 12, color: c.muted },
    ratings: { flexDirection: 'row', gap: 8 },
    rateBtn: {
      flex: 1,
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    rateText: { color: c.onAccent, fontWeight: '600' },
    done: { fontSize: 18, fontWeight: '600', color: c.ink },
    link: { color: c.accent, fontSize: 15 },
  });
