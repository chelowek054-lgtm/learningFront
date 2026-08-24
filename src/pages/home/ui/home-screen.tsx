// Home-дашборд (WS8): «на сегодня» — повторения, активности, адаптивный сигнал.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/entities/session';
import type { Activity } from '@/shared/engine';
import { getLocalStore, syncNow } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';

export function HomeScreen({
  onOpenReview,
  onOpenGraph,
  onOpenPlacement,
  onOpenCourse,
  onOpenActivity,
}: {
  onOpenReview: () => void;
  onOpenGraph: () => void;
  onOpenPlacement: () => void;
  onOpenCourse: () => void;
  onOpenActivity: (a: Activity) => void;
}) {
  const { user, logout } = useSession();
  const online = useIsOnline();
  const [dueCount, setDueCount] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>Praxis</Text>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>выйти</Text>
          </Pressable>
        </View>
        <Text style={styles.sub}>
          {user?.email} {online ? '· онлайн' : '· офлайн'}
        </Text>

        {weakest && <Text style={styles.hint}>💡 Стоит подтянуть: {weakest}</Text>}

        <Pressable style={styles.reviewCard} onPress={onOpenReview}>
          <Text style={styles.reviewCount}>{dueCount}</Text>
          <Text style={styles.reviewLabel}>карточек к повторению</Text>
        </Pressable>

        <Pressable style={styles.graphCard} onPress={onOpenGraph}>
          <Text style={styles.graphText}>🕸️ Граф знаний · ML</Text>
        </Pressable>

        <Pressable style={styles.graphCard} onPress={onOpenPlacement}>
          <Text style={styles.graphText}>🎯 Определить уровень</Text>
        </Pressable>

        <Pressable style={styles.graphCard} onPress={onOpenCourse}>
          <Text style={styles.graphText}>🧭 Мой курс</Text>
        </Pressable>

        <Text style={styles.section}>Задания</Text>
        {activities.length === 0 && (
          <Text style={styles.empty}>Пусто. Потяните вниз для синхронизации.</Text>
        )}
        {activities.map((a) => (
          <Pressable key={a.id} style={styles.row} onPress={() => onOpenActivity(a)}>
            <Text style={styles.rowType}>{a.type}</Text>
            <Text style={styles.rowModule}>{a.module}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 28, fontWeight: '700' },
  logout: { color: '#2563eb' },
  sub: { fontSize: 13, opacity: 0.6 },
  hint: { fontSize: 14, backgroundColor: '#fde68a55', padding: 10, borderRadius: 8 },
  reviewCard: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  reviewCount: { color: '#fff', fontSize: 40, fontWeight: '800' },
  reviewLabel: { color: '#fff', fontSize: 14, opacity: 0.9 },
  graphCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  graphText: { fontSize: 15, fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  empty: { fontSize: 13, opacity: 0.5 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: 10,
    padding: 14,
  },
  rowType: { fontSize: 15, fontWeight: '500', fontFamily: 'monospace' },
  rowModule: { fontSize: 12, opacity: 0.5 },
});
