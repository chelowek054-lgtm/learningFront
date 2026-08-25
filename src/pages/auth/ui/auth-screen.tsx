// Экран входа/регистрации (WS1) + вход в восстановление пароля.
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Display, Field, Muted, Note, Screen, space } from '@/shared/ui';
import { useSession } from '@/entities/session';
import { ApiError, NetworkError } from '@/shared/api';

import { PasswordResetScreen } from './password-reset-screen';

/** Показать настоящую причину: сетевой сбой ≠ неверный пароль (иначе диагноз невозможен). */
function describe(e: unknown, mode: 'login' | 'register'): string {
  if (e instanceof NetworkError)
    return `${e.message}. Проверьте, что backend запущен и адрес верный.`;
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Неверный email или пароль';
    if (e.status === 409) return 'Этот email уже зарегистрирован';
    if (e.status === 422) return 'Проверьте формат email и длину пароля (мин. 6)';
    return `Ошибка сервера ${e.status}: ${e.message.slice(0, 200)}`;
  }
  return `Не удалось ${mode === 'login' ? 'войти' : 'зарегистрироваться'}: ${String(e)}`;
}

export function AuthScreen() {
  const { login, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          setNotice('Пароль изменён. Войдите с новым паролем.');
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
        <Display>Praxis</Display>
        <Muted>{mode === 'login' ? 'Вход' : 'Регистрация'}</Muted>
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
        placeholder="пароль (мин. 6)"
        secureTextEntry
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        value={password}
        onChangeText={setPassword}
      />

      {notice && <Note tone="ok">{notice}</Note>}
      {error && <Note tone="danger">{error}</Note>}

      <Button
        label={mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        onPress={submit}
        busy={busy}
      />
      <Button
        label={mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
        variant="quiet"
        onPress={() => {
          setNotice(null);
          setError(null);
          setMode(mode === 'login' ? 'register' : 'login');
        }}
      />
      {mode === 'login' && (
        <Button
          label="Забыли пароль?"
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
