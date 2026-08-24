// Вкладка «Сегодня». Роут тонкий: страница не знает про роутер (правило FSD),
// переходы задаёт слой app.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from '@/pages/home';
import type { Activity } from '@/shared/engine';
import { space, useTheme } from '@/shared/ui';
import { ActivityDispatcher } from '@/widgets/activity-dispatcher';

export default function TodayTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activity, setActivity] = useState<Activity | null>(null);

  if (activity) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => setActivity(null)} hitSlop={8}>
            <Text style={{ color: colors.accent }}>← К заданиям</Text>
          </Pressable>
          <ActivityDispatcher activity={activity} onComplete={() => setActivity(null)} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <HomeScreen
      onOpenReview={() => router.push('/review')}
      onOpenPlacement={() => router.push('/placement')}
      onOpenCourse={() => router.navigate('/course')}
      onOpenActivity={setActivity}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
});
