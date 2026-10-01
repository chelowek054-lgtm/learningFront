import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ReviewScreen } from '@/pages/review';

export default function ReviewRoute() {
  const router = useRouter();
  const { cards } = useLocalSearchParams<{ cards?: string }>();
  // Шаг курса передаёт id карточек через запятую; без параметра — вся очередь.
  const cardIds = useMemo(() => (cards ? cards.split(',').filter(Boolean) : undefined), [cards]);
  return <ReviewScreen cardIds={cardIds} onDone={() => router.back()} />;
}
