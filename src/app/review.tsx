import { useRouter } from 'expo-router';
import { ReviewScreen } from '@/pages/review';

export default function ReviewRoute() {
  const router = useRouter();
  return <ReviewScreen onDone={() => router.back()} />;
}
