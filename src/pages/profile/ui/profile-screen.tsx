// Профиль: кто вошёл, цели из онбординга, состояние синхронизации, выход.
// Раньше выход прятался в углу главной — теперь у него есть своё место.
import { useEffect, useState } from 'react';
import { targetLabel, useSession } from '@/entities/session';
import { getLocalStore, syncNow, updateProfile } from '@/shared/api';
import { useIsOnline } from '@/shared/lib';
import { Pressable, Text, View } from 'react-native';
import {
  Button,
  Card,
  Empty,
  Label,
  Muted,
  Note,
  radius,
  Screen,
  space,
  Title,
  useTheme,
  type ThemeMode,
} from '@/shared/ui';

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'Как в системе' },
  { key: 'light', label: 'Светлая' },
  { key: 'dark', label: 'Тёмная' },
];

function ThemePicker() {
  const { colors, mode, setMode } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {THEMES.map((t) => {
        const active = mode === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => setMode(t.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: space.sm,
              paddingHorizontal: space.xs,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? colors.accent : colors.surfaceAlt,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? '600' : '400',
                color: active ? colors.onAccent : colors.muted,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProfileScreen({ onOpenActivities }: { onOpenActivities?: () => void }) {
  const { user, logout, refresh, subject } = useSession();
  const online = useIsOnline();
  const [due, setDue] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const cards = await getLocalStore().listDueSrsCards(new Date().toISOString());
        setDue(cards.length);
      } catch {
        setDue(null);
      }
    })();
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      await syncNow(getLocalStore());
      setSynced(new Date().toLocaleTimeString());
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen>
      <Title>Профиль</Title>

      <Card>
        <Label>Аккаунт</Label>
        <Muted>{user?.email ?? 'без email'}</Muted>
        {user?.is_superuser && <Note tone="warn">Права администратора</Note>}
      </Card>

      <Card>
        <Label>Предмет</Label>
        {subject ? (
          <>
            <Muted>{subject.title}</Muted>
            <Muted>Цель: {targetLabel(subject.target)}</Muted>
          </>
        ) : (
          <Muted>Предмет не выбран</Muted>
        )}
        {/* Сброс возвращает в онбординг: гейт в app/_layout показывает его,
            пока profile.onboarded не выставлен. Отдельного экрана не нужно. */}
        <Button
          label="Сменить предмет"
          variant="quiet"
          onPress={() =>
            void (async () => {
              // Профиль заменяется целиком, поэтому переносим остальное:
              // иначе смена предмета стирала бы всё, что в нём накопилось.
              await updateProfile({ ...(user?.profile ?? {}), onboarded: false });
              await refresh();
            })()
          }
        />
      </Card>

      <Card>
        <Label>Оформление</Label>
        <ThemePicker />
      </Card>

      <Card>
        <Label>Синхронизация</Label>
        <Muted>{online ? 'Сеть есть' : 'Офлайн — изменения уйдут при подключении'}</Muted>
        {due !== null && <Muted>Карточек к повторению: {due}</Muted>}
        {synced && <Note tone="ok">Синхронизировано в {synced}</Note>}
        <Button
          label="Синхронизировать сейчас"
          variant="quiet"
          onPress={sync}
          disabled={!online}
          busy={syncing}
        />
      </Card>

      {/* Сырой список заданий — отладочный вид. На «Сегодня» он мешал:
          человек видел слуги типов вместо одного понятного шага. */}
      {onOpenActivities && (
        <Card onPress={onOpenActivities}>
          <Label>Разработчику</Label>
          <Muted>Все задания списком — служебный экран</Muted>
        </Card>
      )}

      {!user && <Empty text="Нет данных пользователя" />}

      <Button label="Выйти" variant="danger" onPress={() => void logout()} />
    </Screen>
  );
}
