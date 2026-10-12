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
  Chip,
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
import { LANGUAGES, LANGUAGE_NAMES, useI18n } from '@/shared/i18n';

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

/** Язык интерфейса: «как на устройстве» или явный выбор; запоминается на устройстве (R-0081). */
function LanguagePicker() {
  const { t, lang, manual, setLang } = useI18n();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Chip text={t('profile.languageAuto')} selected={!manual} onPress={() => setLang(null)} />
      {LANGUAGES.map((code) => (
        <Chip
          key={code}
          text={LANGUAGE_NAMES[code]}
          selected={manual && lang === code}
          onPress={() => setLang(code)}
        />
      ))}
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
  const { t } = useI18n();
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
      setDeleteError(t('profile.deleteFailed'));
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
      <Title>{t('profile.title')}</Title>

      <Card>
        <Label>{t('profile.account')}</Label>
        <Lead>{user?.email ?? t('profile.noEmail')}</Lead>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Pill
            text={online ? t('common.online') : t('common.offline')}
            tone={online ? 'accent' : 'muted'}
          />
          {user?.is_superuser && <Pill text={t('profile.admin')} tone="warn" />}
        </View>
      </Card>

      <Card>
        <Label>{t('profile.subject')}</Label>
        {subject ? (
          <>
            <Muted>{subject.title}</Muted>
            <Muted>{t('profile.goal', { target: targetLabel(subject.target) })}</Muted>
          </>
        ) : (
          <Muted>{t('profile.noSubject')}</Muted>
        )}
        {/* Смена предмета — выбор из «Моей библиотеки»: онбординг не сбрасывается (R-0059). */}
        {onOpenLibrary && (
          <Button label={t('profile.changeSubject')} variant="quiet" onPress={onOpenLibrary} />
        )}
      </Card>

      {onOpenLibrary && (
        <Card tone="accent" onPress={onOpenLibrary}>
          <Label>{t('profile.library')}</Label>
          {subject && <Lead>{subject.title}</Lead>}
          <Muted>{t('profile.libraryHint')}</Muted>
        </Card>
      )}

      {user?.is_superuser && onOpenCurator && (
        <Card onPress={onOpenCurator}>
          <Label>{t('profile.curator')}</Label>
          <Muted>{t('profile.curatorHint')}</Muted>
        </Card>
      )}

      <PushSettings />

      <Card>
        <Label>{t('profile.method')}</Label>
        <StudyMethodPicker />
      </Card>

      <Card>
        <Label>{t('profile.appearance')}</Label>
        <ThemePicker />
      </Card>

      <Card>
        <Label>{t('profile.language')}</Label>
        <LanguagePicker />
      </Card>

      <Card>
        <Label>{t('profile.sync')}</Label>
        <Muted>{online ? t('profile.syncOn') : t('profile.syncOff')}</Muted>
        {due !== null && <Muted>{t('profile.due', { due })}</Muted>}
        {synced && <Note tone="ok">{t('profile.synced', { time: synced })}</Note>}
        <Button
          label={t('profile.syncNow')}
          variant="quiet"
          onPress={sync}
          disabled={!online}
          busy={syncing}
        />
      </Card>

      {!user && <Empty text={t('profile.noUser')} />}

      <Card>
        <Label>{t('profile.myData')}</Label>
        <Muted>{t('profile.deleteHint')}</Muted>
        {deleting ? (
          <>
            <Field
              placeholder={t('profile.deletePassword')}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
            />
            {deleteError && <Note tone="danger">{deleteError}</Note>}
            <Button
              label={t('profile.deleteForever')}
              variant="danger"
              onPress={() => void removeAccount()}
              disabled={!online || deletePassword.length === 0}
            />
            <Button label={t('common.cancel')} variant="quiet" onPress={() => setDeleting(false)} />
          </>
        ) : (
          <Button
            label={t('profile.deleteAccount')}
            variant="quiet"
            onPress={() => setDeleting(true)}
          />
        )}
      </Card>

      <Button label={t('profile.logout')} variant="danger" onPress={() => void logout()} />
    </Screen>
  );
}
