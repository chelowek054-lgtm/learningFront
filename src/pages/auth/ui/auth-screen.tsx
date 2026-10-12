// Экран входа/регистрации (WS1) + вход в восстановление пароля.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Display, Field, Muted, Note, Screen, space } from '@/shared/ui';
import { useSession } from '@/entities/session';
import { ApiError, NetworkError } from '@/shared/api';

import { PasswordResetScreen } from './password-reset-screen';
import { translate, useI18n } from '@/shared/i18n';

/** Показать настоящую причину: сетевой сбой ≠ неверный пароль (иначе диагноз невозможен). */
function describe(e: unknown, mode: 'login' | 'register'): string {
  const t = translate;
  if (e instanceof NetworkError) return t('auth.networkHint', { message: e.message });
  if (e instanceof ApiError) {
    if (e.status === 401) return t('auth.err401');
    if (e.status === 409) return t('auth.err409');
    if (e.status === 422) return t('auth.err422');
    return t('auth.errServer', { status: e.status, message: e.message.slice(0, 200) });
  }
  return t(mode === 'login' ? 'auth.failLogin' : 'auth.failRegister', { error: String(e) });
}

export function AuthScreen() {
  const { t } = useI18n();
  const { login, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (mode === 'reset') {
    return (
      <PasswordResetScreen
        initialEmail={email}
        onCancel={() => setMode('login')}
        onDone={(usedEmail) => {
          // Backend на смену пароля отдаёт 204 без токена — входим обычным путём.
          setEmail(usedEmail);
          setPassword('');
          setError(null);
          setNotice(t('auth.passwordChanged'));
          setMode('login');
        }}
      />
    );
  }

  async function submit() {
    // Форма отправки существует только в двух режимах: ветка 'reset' вышла выше.
    const formMode = mode === 'register' ? 'register' : 'login';
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (formMode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password);
    } catch (e) {
      setError(describe(e, formMode));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.xxl }}>
        <Display>{mode === 'login' ? t('auth.titleLogin') : t('auth.titleRegister')}</Display>
        <Muted>{t('auth.tagline')}</Muted>
      </View>

      <Field
        placeholder="email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        value={password}
        onChangeText={setPassword}
      />

      {notice && <Note tone="ok">{notice}</Note>}
      {error && <Note tone="danger">{error}</Note>}

      {mode === 'register' && (
        <Pressable
          onPress={() => setAccepted(!accepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', minHeight: 44 }}
        >
          <Muted>
            {accepted ? '☑' : '☐'} {t('auth.consent')}
          </Muted>
        </Pressable>
      )}

      <Button
        label={mode === 'login' ? t('auth.login') : t('auth.register')}
        onPress={submit}
        busy={busy}
        disabled={mode === 'register' && !accepted}
      />
      <Button
        label={mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
        variant="quiet"
        onPress={() => {
          setNotice(null);
          setError(null);
          setMode(mode === 'login' ? 'register' : 'login');
        }}
      />
      {mode === 'login' && (
        <Button
          label={t('auth.forgot')}
          variant="quiet"
          onPress={() => {
            setNotice(null);
            setError(null);
            setMode('reset');
          }}
        />
      )}
    </Screen>
  );
}
