// Стартовый экран Ф0: подтверждает связку ядро + модули + SQLite.
// Показывает зарегистрированные модули/типы Activity, статус локальной БД
// и демо-диспетчеризацию рендерера через реестр.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Activity } from '@/shared/engine';
import { useModuleRegistry } from '@/shared/lib';
import { createSqliteLocalStore } from '@/shared/api';
import { ActivityDispatcher } from '@/widgets/activity-dispatcher';

export function HomeScreen() {
  const registry = useModuleRegistry();
  const modules = useMemo(() => registry.getModules(), [registry]);
  const [dbStatus, setDbStatus] = useState('проверка…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = createSqliteLocalStore();
        const activities = await store.listActivities();
        if (!cancelled) setDbStatus(`OK · activities: ${activities.length}`);
      } catch (e) {
        if (!cancelled) setDbStatus(`недоступно (${String(e)})`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Демо: диспетчеризация рендерера для первого зарегистрированного типа.
  const firstType = registry.getActivityTypes()[0]?.type;
  const demoActivity: Activity | undefined = firstType
    ? {
        id: 'demo',
        userId: 'demo',
        module: registry.getModuleIdForType(firstType) ?? '',
        type: firstType,
        connectivity: 'offline',
        payload: {},
        createdAt: '1970-01-01T00:00:00.000Z',
      }
    : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Praxis</Text>
        <Text style={styles.sub}>Фаза 0 — каркас: ядро · модули · SQLite</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Локальная БД (SQLite)</Text>
          <Text style={styles.value}>{dbStatus}</Text>
        </View>

        {modules.map((m) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.moduleTitle}>
              {m.title} <Text style={styles.moduleId}>({m.id})</Text>
            </Text>
            {m.activityTypes.map((t) => (
              <View key={t.type} style={styles.row}>
                <Text style={styles.type}>{t.type}</Text>
                <Text
                  style={[
                    styles.badge,
                    t.connectivity === 'online' ? styles.online : styles.offline,
                  ]}
                >
                  {t.connectivity}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {demoActivity && (
          <View style={styles.card}>
            <Text style={styles.label}>Демо-диспетчеризация</Text>
            <ActivityDispatcher activity={demoActivity} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  h1: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14, opacity: 0.6, marginBottom: 4 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    padding: 14,
    gap: 8,
  },
  label: { fontSize: 13, opacity: 0.6 },
  value: { fontSize: 15, fontWeight: '500' },
  moduleTitle: { fontSize: 17, fontWeight: '600' },
  moduleId: { fontSize: 13, opacity: 0.5, fontWeight: '400' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { fontSize: 14, fontFamily: 'monospace' },
  badge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  online: { backgroundColor: '#2563eb22', color: '#2563eb' },
  offline: { backgroundColor: '#6b728022', color: '#6b7280' },
});
