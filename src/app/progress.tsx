import { useRouter } from 'expo-router';
import { ProgressScreen } from '@/pages/progress';

export default function ProgressRoute() {
  const router = useRouter();
  return <ProgressScreen onBack={() => router.back()} />;
}
