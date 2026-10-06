// Экран плейсмента — тонкая обёртка над фичами (FSD: страница не держит логику).
// Два режима: уровень внутри выбранного предмета и проверка базовых областей под целью (T-0075).
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/entities/session';
import { PlacementSession } from '@/features/placement';
import { PriorTestSession } from '@/features/prior-test';
import { Empty, Screen, TopBar, useTheme } from '@/shared/ui';

type Mode = 'subject' | 'foundations';

const MODES: { key: Mode; label: string }[] = [
  { key: 'subject', label: 'В предмете' },
  { key: 'foundations', label: 'Базовые области' },
];

export function PlacementScreen({ onBack }: { onBack?: () => void }) {
  const { subject } = useSession();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('subject');
  return (
    <Screen scroll={false}>
      <TopBar title="Определить уровень" onBack={onBack} />
      {subject ? (
        <>
          <View style={styles.tabs}>
            {MODES.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.tab, { borderColor: mode === m.key ? colors.accent : colors.line }]}
              >
                <Text
                  style={{
                    color: mode === m.key ? colors.accent : colors.muted,
                    fontWeight: '600',
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {mode === 'subject' ? (
            <PlacementSession domain={subject.id} />
          ) : (
            <PriorTestSession domain={subject.id} />
          )}
        </>
      ) : (
        <Empty text="Сначала выберите предмет." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', borderWidth: 2, borderRadius: 10, paddingVertical: 8 },
});
