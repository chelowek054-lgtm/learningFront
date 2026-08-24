// Тонкий роут + guard + навигация (app-композиция): Auth → Onboarding → Home/Review/Activity.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/entities/session';
import type { Activity } from '@/shared/engine';
import { AuthScreen } from '@/pages/auth';
import { GraphScreen } from '@/pages/graph';
import { HomeScreen } from '@/pages/home';
import { OnboardingScreen } from '@/pages/onboarding';
import { CourseScreen } from '@/pages/course';
import { PlacementScreen } from '@/pages/placement';
import { ReviewScreen } from '@/pages/review';
import { ActivityDispatcher } from '@/widgets/activity-dispatcher';

type View = 'home' | 'review' | 'graph' | 'placement' | 'course' | { activity: Activity };

function ActivityRunner({ activity, onBack }: { activity: Activity; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.runner}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Назад</Text>
        </Pressable>
        <ActivityDispatcher activity={activity} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Index() {
  const { status, user } = useSession();
  const [view, setView] = useState<View>('home');

  if (status === 'loading') return null; // splash держится
  if (status === 'anonymous') return <AuthScreen />;
  if (!user?.profile?.onboarded) return <OnboardingScreen />;

  if (view === 'review') return <ReviewScreen onDone={() => setView('home')} />;
  if (view === 'graph') return <GraphScreen onBack={() => setView('home')} />;
  if (view === 'placement') return <PlacementScreen />;
  if (view === 'course') return <CourseScreen />;
  if (typeof view === 'object') {
    return <ActivityRunner activity={view.activity} onBack={() => setView('home')} />;
  }
  return (
    <HomeScreen
      onOpenReview={() => setView('review')}
      onOpenGraph={() => setView('graph')}
      onOpenPlacement={() => setView('placement')}
      onOpenCourse={() => setView('course')}
      onOpenActivity={(a) => setView({ activity: a })}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  runner: { padding: 16, gap: 12 },
  back: { color: '#2563eb', fontSize: 15 },
});
