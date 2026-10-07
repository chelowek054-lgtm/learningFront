import { useRouter } from 'expo-router';
import { GraphScreen } from '@/pages/graph';

export default function GraphTab() {
  const router = useRouter();
  return <GraphScreen onOpenOutline={() => router.push('/skill-profile')} />;
}
