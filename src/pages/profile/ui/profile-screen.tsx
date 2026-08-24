// Профиль: кто вошёл, цели из онбординга, состояние синхронизации, выход.
// Раньше выход прятался в углу главной — теперь у него есть своё место.
import { useEffect, useState } from 'react';
import { useSession } from '@/entities/session';
import { getLocalStore, syncNow } from '@/shared/api';
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

interface Goals {
  targetBand?: number;
  mlTopics?: string[];
}

export function ProfileScreen() {
  const { user, logout } = useSession();
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

  const goals = (user?.profile ?? {}) as Goals;

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
        <Label>Цели</Label>
        {goals.targetBand ? (
          <Muted>Целевой балл: {goals.targetBand}</Muted>
        ) : (
          <Muted>Целевой балл не задан</Muted>
        )}
        {goals.mlTopics?.length ? (
          <Muted>Темы: {goals.mlTopics.join(', ')}</Muted>
        ) : (
          <Muted>Темы не выбраны</Muted>
        )}
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

      {!user && <Empty text="Нет данных пользователя" />}

      <Button label="Выйти" variant="danger" onPress={() => void logout()} />
    </Screen>
  );
}
