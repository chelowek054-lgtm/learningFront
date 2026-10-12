// Профиль: кто вошёл, цели из онбординга, состояние синхронизации, выход.
// Раньше выход прятался в углу главной — теперь у него есть своё место.
import { useEffect, useState } from 'react';
import { targetLabel, useSession } from '@/entities/session';
import { deleteAccount, getLocalStore, syncNow, updateProfile } from '@/shared/api';
import { PushSettings } from '@/features/push-settings';
import { StudyMethodPicker } from '@/features/study-method';
import { useIsOnline } from '@/shared/lib';
import { Pressable, Text, View } from 'react-native';
import {
  Button,
  Card,
  Empty,
  Field,
  Label,
  Lead,
  Muted,
  Note,
  Pill,
  radius,
  Screen,
  space,
  Title,
  useTheme,
  THEME_MODES,
} from '@/shared/ui';

function ThemePicker() {
  const { colors, mode, setMode } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {THEME_MODES.map((t) => {
        const active = mode === t.mode;
        return (
          <Pressable
            key={t.mode}
            onPress={() => setMode(t.mode)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              flexGrow: 1,
              minHeight: 44,
              justifyContent: 'center',
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

export function ProfileScreen({
  onOpenCurator,
  onOpenLibrary,
}: {
  onOpenCurator?: () => void;
  onOpenLibrary?: () => void;
}) {
  const { user, logout, refresh, subject } = useSession();
  const online = useIsOnline();
  const [due, setDue] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function removeAccount() {
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword);
      await logout();
    } catch {
      setDeleteError('Не удалось удалить: проверьте пароль и связь.');
    }
  }

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
        <Lead>{user?.email ?? 'без email'}</Lead>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Pill text={online ? 'онлайн' : 'офлайн'} tone={online ? 'accent' : 'muted'} />
          {user?.is_superuser && <Pill text="администратор" tone="warn" />}
        </View>
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
        {/* Смена предмета — выбор из «Моей библиотеки»: онбординг не сбрасывается (R-0059). */}
        {onOpenLibrary && (
          <Button label="Сменить предмет" variant="quiet" onPress={onOpenLibrary} />
        )}
      </Card>

      {onOpenLibrary && (
        <Card tone="accent" onPress={onOpenLibrary}>
          <Label>Моя библиотека</Label>
          {subject && <Lead>{subject.title}</Lead>}
          <Muted>Все ваши предметы: открыть, поставить на паузу, добавить новый</Muted>
        </Card>
      )}

      {user?.is_superuser && onOpenCurator && (
        <Card onPress={onOpenCurator}>
          <Label>Куратор</Label>
          <Muted>Источники знаний и служебные экраны</Muted>
        </Card>
      )}

      <PushSettings />

      <Card>
        <Label>Способ запоминания</Label>
        <StudyMethodPicker />
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

      <Card>
        <Label>Мои данные</Label>
        <Muted>Удаление стирает аккаунт и все ваши данные без возможности восстановления.</Muted>
        {deleting ? (
          <>
            <Field
              placeholder="пароль для подтверждения"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            {deleteError && <Note tone="danger">{deleteError}</Note>}
            <Button
              label="Удалить навсегда"
              variant="danger"
              onPress={() => void removeAccount()}
              disabled={!online || deletePassword.length === 0}
            />
            <Button label="Отмена" variant="quiet" onPress={() => setDeleting(false)} />
          </>
        ) : (
          <Button label="Удалить аккаунт" variant="quiet" onPress={() => setDeleting(true)} />
        )}
      </Card>

      <Button label="Выйти" variant="danger" onPress={() => void logout()} />
    </Screen>
  );
}
