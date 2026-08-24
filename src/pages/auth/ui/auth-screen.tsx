// Экран входа/регистрации (WS1).
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Display, Muted, Note, Screen, space, useTheme } from '@/shared/ui';
import { useSession } from '@/entities/session';
import { ApiError, NetworkError } from '@/shared/api';

/** Показать настоящую причину: сетевой сбой ≠ неверный пароль (иначе диагноз невозможен). */
function describe(e: unknown, mode: 'login' | 'register'): string {
  if (e instanceof NetworkError) return `${e.message}. Проверьте, что backend запущен и адрес верный.`;
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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password);
    } catch (e) {
      setError(describe(e, mode));
    } finally {
      setBusy(false);
    }
  }

  const { colors } = useTheme();
  const input = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    borderRadius: 8,
    padding: space.md,
    fontSize: 16,
  };

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.xxl }}>
        <Display>Praxis</Display>
        <Muted>{mode === 'login' ? 'Вход' : 'Регистрация'}</Muted>
      </View>

      <TextInput
        style={input}
        placeholder="email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={input}
        placeholder="пароль (мин. 6)"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Note tone="danger">{error}</Note>}

      <Button
        label={mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        onPress={submit}
        busy={busy}
      />
      <Button
        label={mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
        variant="quiet"
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
      />
    </Screen>
  );
}
