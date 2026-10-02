import { useRouter } from 'expo-router';
import { MaterialsScreen } from '@/pages/materials';

export default function MaterialsRoute() {
  const router = useRouter();
  return <MaterialsScreen onBack={() => router.back()} />;
}
