// Вкладка «Сегодня». Роут тонкий: страница не знает про роутер (правило FSD),
// переходы задаёт слой app.
import { useRouter } from 'expo-router';
import { HomeScreen } from '@/pages/home';

export default function TodayTab() {
  const router = useRouter();
  return (
    <HomeScreen
      onOpenReview={() => router.push('/review')}
      onOpenPlacement={() => router.push('/placement')}
      onOpenCourse={() => router.navigate('/course')}
    />
  );
}
