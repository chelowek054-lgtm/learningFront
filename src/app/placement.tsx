import { useRouter } from 'expo-router';
import { PlacementScreen } from '@/pages/placement';

export default function PlacementRoute() {
  const router = useRouter();
  return <PlacementScreen onBack={() => router.back()} />;
}
