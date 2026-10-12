// Вкладки: Сегодня, Путь, Прогресс, Профиль. Панель навигации — в общем каркасе (widgets/app-nav),
// чтобы её получали и экраны вне вкладок.
import { Tabs } from 'expo-router';

const TAB_NAMES = ['index', 'path', 'progress', 'profile'] as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      {TAB_NAMES.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
