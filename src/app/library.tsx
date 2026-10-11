import { useRouter } from 'expo-router';
import { LibraryScreen } from '@/pages/library';

export default function LibraryRoute() {
  const router = useRouter();
  return <LibraryScreen onBack={() => router.back()} onOpened={() => router.navigate('/')} />;
}
