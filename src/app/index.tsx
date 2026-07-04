// Тонкий роут expo-router + guard: аноним → экран входа, иначе Home.
import { useSession } from '@/entities/session';
import { AuthScreen } from '@/pages/auth';
import { HomeScreen } from '@/pages/home';

export default function Index() {
  const { status } = useSession();
  if (status === 'loading') return null; // splash держится
  if (status === 'anonymous') return <AuthScreen />;
  return <HomeScreen />;
}
