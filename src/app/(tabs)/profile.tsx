import { useRouter } from 'expo-router';
import { ProfileScreen } from '@/pages/profile';

export default function ProfileTab() {
  const router = useRouter();
  return (
    <ProfileScreen
      onOpenCurator={() => router.push('/curator')}
      onOpenLibrary={() => router.push('/library')}
    />
  );
}
