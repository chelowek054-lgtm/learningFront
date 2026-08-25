// Восстановление пароля: запрос кода → смена пароля.
//
// Два шага в одном экране, а не два роута: пока сессии нет, показывать нечего,
// и гейт в app/_layout рисует ветку авторизации сам (роутов у неё нет).
import { useState } from 'react';
import { View } from 'react-native';

import { ApiError, NetworkError, confirmPasswordReset, requestPasswordReset } from '@/shared/api';
import { Button, Display, Field, Muted, Note, Screen, space } from '@/shared/ui';

const CODE_LENGTH = 8;
const MIN_PASSWORD = 6;

/** Причина должна быть различима: просроченный код ≠ нет связи ≠ исчерпаны попытки. */
function describe(e: unknown): string {
  if (e instanceof NetworkError) {
    return `${e.message}. Проверьте, что backend запущен и адрес верный.`;
  }
  if (e instanceof ApiError) {
    if (e.status === 400) return 'Код недействителен или просрочен — запросите новый';
    if (e.status === 429) return 'Слишком много попыток. Запросите новый код';
    if (e.status === 422) return `Код — ${CODE_LENGTH} цифр, пароль — от ${MIN_PASSWORD} символов`;
    return `Ошибка сервера ${e.status}: ${e.message.slice(0, 200)}`;
  }
  return `Не удалось сменить пароль: ${String(e)}`;
}

export function PasswordResetScreen({
  initialEmail,
  onDone,
  onCancel,
}: {
  initialEmail: string;
  /** Возврат ко входу: email пробрасывается, чтобы не набирать его снова. */
  onDone: (email: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [ttl, setTtl] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  const askCode = () =>
    run(async () => {
      const { ttl_minutes } = await requestPasswordReset(email.trim());
      setTtl(ttl_minutes);
      setStep('confirm');
    });

  const applyNewPassword = () =>
    run(async () => {
      await confirmPasswordReset(email.trim(), code.trim(), password);
      onDone(email.trim());
    });

  const emailReady = email.trim().length > 0;
  const confirmReady = code.trim().length === CODE_LENGTH && password.length >= MIN_PASSWORD;

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.xxl }}>
        <Display>Praxis</Display>
        <Muted>Восстановление пароля</Muted>
      </View>

      {step === 'request' ? (
        <>
          <Muted>Укажите email — вышлем код для смены пароля.</Muted>
          <Field
            placeholder="email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {error && <Note tone="danger">{error}</Note>}
          <Button label="Получить код" onPress={askCode} busy={busy} disabled={!emailReady} />
          <Button label="Вернуться ко входу" variant="quiet" onPress={onCancel} />
        </>
      ) : (
        <>
          <Note tone="ok">
            {ttl === null
              ? 'Код выпущен.'
              : `Код выпущен и действует ${ttl} мин. Действителен только последний код.`}
          </Note>
          {/* Честно: доставки писем ещё нет (см. ROADMAP), код лежит в БД. Без
              этой строки экран выглядит сломанным — письмо не приходит никогда. */}
          <Note tone="warn">
            Отправка писем пока не подключена: код смотрите в таблице password_reset_code (pgAdmin).
          </Note>

          <Field
            placeholder={`код из ${CODE_LENGTH} цифр`}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
          />
          <Field
            placeholder={`новый пароль (мин. ${MIN_PASSWORD})`}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />

          {error && <Note tone="danger">{error}</Note>}

          <Button
            label="Сменить пароль"
            onPress={applyNewPassword}
            busy={busy}
            disabled={!confirmReady}
          />
          <Button label="Запросить код заново" variant="quiet" onPress={askCode} disabled={busy} />
          <Button label="Вернуться ко входу" variant="quiet" onPress={onCancel} />
        </>
      )}
    </Screen>
  );
}
