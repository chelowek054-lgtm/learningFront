// «Моя библиотека» (T-0119, R-0062): список предметов человека; открыть, поставить на паузу, удалить, добавить.
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/entities/session';
import {
  addSubject,
  deleteSubject,
  listSubjects,
  patchSubject,
  updateProfile,
  type SubjectStatus,
  type UserSubject,
} from '@/shared/api';
import { View } from 'react-native';
import { Button, Card, Empty, Label, Muted, Note, Pill, Screen, space, TopBar } from '@/shared/ui';

const STATUS_TONE: Record<SubjectStatus, 'accent' | 'info' | 'muted'> = {
  building: 'info',
  active: 'accent',
  paused: 'muted',
  reached: 'accent',
};

const STATUS_TEXT: Record<SubjectStatus, string> = {
  building: 'собирается',
  active: 'идёт',
  paused: 'на паузе',
  reached: 'цель достигнута',
};

export function LibraryScreen({
  onBack,
  onOpened,
}: {
  onBack?: () => void;
  onOpened?: () => void;
}) {
  const { user, subject, refresh } = useSession();
  const [items, setItems] = useState<UserSubject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Удаление в два шага: сперва вопрос, потом действие — предмет с картой не возвращается.
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      let list = await listSubjects();
      // Предмет, заведённый до библиотеки, лежит только в профиле: добавляем его в список.
      if (subject && !list.some((s) => s.domain === subject.id)) {
        await addSubject({ domain: subject.id, title: subject.title, target: subject.target });
        list = await listSubjects();
      }
      setItems(list);
    } catch {
      setError('Не удалось загрузить библиотеку.');
    }
  }, [subject]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(s: UserSubject) {
    const profile = user?.profile ?? {};
    await updateProfile({
      ...profile,
      onboarded: true,
      subject: { ...(profile.subject as object), id: s.domain, title: s.title, target: s.target },
    });
    await refresh();
    onOpened?.();
  }

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch {
      setError('Не получилось. Попробуйте ещё раз.');
    }
  }

  async function addNew() {
    await updateProfile({ ...(user?.profile ?? {}), onboarded: false });
    await refresh();
  }

  return (
    <Screen>
      <TopBar title="Моя библиотека" onBack={onBack} />
      {error && <Note tone="danger">{error}</Note>}
      {items === null ? (
        <Muted>Загружаю…</Muted>
      ) : items.length === 0 ? (
        <Empty text="Пока пусто. Добавьте первый предмет." />
      ) : (
        items.map((s) => {
          const current = subject?.id === s.domain;
          return (
            <Card key={s.id} tone={current ? 'accent' : 'plain'}>
              <Label>{s.title}</Label>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Pill text={STATUS_TEXT[s.status]} tone={STATUS_TONE[s.status]} />
                {current && <Pill text="сейчас открыт" tone="accent" />}
              </View>
              {!current && <Button label="Открыть" onPress={() => void open(s)} />}
              <Button
                label={s.status === 'paused' ? 'Вернуть в работу' : 'Поставить на паузу'}
                variant="quiet"
                onPress={() =>
                  void act(() =>
                    patchSubject(s.id, { status: s.status === 'paused' ? 'active' : 'paused' }),
                  )
                }
              />
              {confirmId === s.id ? (
                <>
                  <Note tone="danger">
                    Удалить «{s.title}»? Карта и прогресс по предмету пропадут.
                  </Note>
                  <Button
                    label="Да, удалить"
                    variant="danger"
                    onPress={() =>
                      void act(async () => {
                        await deleteSubject(s.id);
                        setConfirmId(null);
                      })
                    }
                  />
                  <Button label="Отмена" variant="quiet" onPress={() => setConfirmId(null)} />
                </>
              ) : (
                <Button label="Удалить" variant="quiet" onPress={() => setConfirmId(s.id)} />
              )}
            </Card>
          );
        })
      )}
      <Button label="Новый предмет" onPress={() => void addNew()} />
    </Screen>
  );
}
