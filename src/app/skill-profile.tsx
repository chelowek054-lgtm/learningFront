import { useRouter } from 'expo-router';
import { SkillProfileScreen } from '@/pages/skill-profile';

export default function SkillProfileRoute() {
  const router = useRouter();
  return <SkillProfileScreen onBack={() => router.back()} />;
}
