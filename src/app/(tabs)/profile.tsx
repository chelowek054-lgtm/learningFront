import { useRouter } from 'expo-router';
import { ProfileScreen } from '@/pages/profile';

export default function ProfileTab() {
  const router = useRouter();
  return (
    <ProfileScreen
      onOpenActivities={() => router.push('/activities')}
      onOpenProgress={() => router.push('/progress')}
      onOpenMaterials={() => router.push('/materials')}
      onOpenSources={() => router.push('/sources')}
      onOpenSkillProfile={() => router.push('/skill-profile')}
    />
  );
}
