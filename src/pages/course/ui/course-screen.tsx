// Экран курса — тонкая обёртка над фичей (FSD: страница не держит логику).
import { SafeAreaView, StyleSheet } from 'react-native';
import { CoursePath } from '@/features/course';

export function CourseScreen({ domain = 'ml' }: { domain?: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <CoursePath domain={domain} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
