import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressScreen } from '@/pages/progress';
import { useTheme } from '@/shared/ui';
import { SubjectBar } from '@/widgets/subject-bar';

export default function ProgressTab() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SubjectBar onOpenLibrary={() => router.push('/library')} />
      <View style={{ flex: 1 }}>
        <ProgressScreen />
      </View>
    </SafeAreaView>
  );
}
