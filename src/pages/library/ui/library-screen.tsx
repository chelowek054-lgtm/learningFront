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
import { useI18n, type Key } from '@/shared/i18n';

const STATUS_TONE: Record<SubjectStatus, 'accent' | 'info' | 'muted'> = {
  building: 'info',
  active: 'accent',
  paused: 'muted',
  reached: 'accent',
};

export function LibraryScreen({
  onBack,
  onOpened,
}: {
  onBack?: () => void;
  onOpened?: () => void;
}) {
  const { t } = useI18n();
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
      setError(t('library.loadFailed'));
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
      setError(t('library.failed'));
    }
  }

  async function addNew() {
    await updateProfile({ ...(user?.profile ?? {}), onboarded: false });
    await refresh();
  }

  return (
    <Screen>
      <TopBar title={t('library.title')} onBack={onBack} />
      {error && <Note tone="danger">{error}</Note>}
      {items === null ? (
        <Muted>{t('common.loading')}</Muted>
      ) : items.length === 0 ? (
        <Empty text={t('library.empty')} />
      ) : (
        items.map((s) => {
          const current = subject?.id === s.domain;
          return (
            <Card key={s.id} tone={current ? 'accent' : 'plain'}>
              <Label>{s.title}</Label>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Pill text={t(`library.status.${s.status}` as Key)} tone={STATUS_TONE[s.status]} />
                {current && <Pill text={t('library.current')} tone="accent" />}
              </View>
              {!current && <Button label={t('common.open')} onPress={() => void open(s)} />}
              <Button
                label={s.status === 'paused' ? t('library.resume') : t('library.pause')}
                variant="quiet"
                onPress={() =>
                  void act(() =>
                    patchSubject(s.id, { status: s.status === 'paused' ? 'active' : 'paused' }),
                  )
                }
              />
              {confirmId === s.id ? (
                <>
                  <Note tone="danger">{t('library.confirmDelete', { title: s.title })}</Note>
                  <Button
                    label={t('library.yesDelete')}
                    variant="danger"
                    onPress={() =>
                      void act(async () => {
                        await deleteSubject(s.id);
                        setConfirmId(null);
                      })
                    }
                  />
                  <Button
                    label={t('common.cancel')}
                    variant="quiet"
                    onPress={() => setConfirmId(null)}
                  />
                </>
              ) : (
                <Button
                  label={t('common.delete')}
                  variant="quiet"
                  onPress={() => setConfirmId(s.id)}
                />
              )}
            </Card>
          );
        })
      )}
      <Button label={t('library.new')} onPress={() => void addNew()} />
    </Screen>
  );
}
