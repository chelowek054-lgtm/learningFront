// Восстановление пароля: запрос кода → смена пароля.
//
// Два шага в одном экране, а не два роута: пока сессии нет, показывать нечего,
// и гейт в app/_layout рисует ветку авторизации сам (роутов у неё нет).
import { useState } from 'react';
import { View } from 'react-native';

import { ApiError, NetworkError, confirmPasswordReset, requestPasswordReset } from '@/shared/api';
import { Button, Display, Field, Muted, Note, Screen, space } from '@/shared/ui';
import { translate, useI18n } from '@/shared/i18n';

const CODE_LENGTH = 8;
const MIN_PASSWORD = 6;

/** Причина должна быть различима: просроченный код ≠ нет связи ≠ исчерпаны попытки. */
function describe(e: unknown): string {
  const t = translate;
  if (e instanceof NetworkError) {
    return t('auth.networkHint', { message: e.message });
  }
  if (e instanceof ApiError) {
    if (e.status === 400) return t('reset.err400');
    if (e.status === 429) return t('reset.err429');
    if (e.status === 422)
      return t('reset.err422', { codeLength: CODE_LENGTH, minPassword: MIN_PASSWORD });
    return t('auth.errServer', { status: e.status, message: e.message.slice(0, 200) });
  }
  return t('reset.failChange', { error: String(e) });
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
  const { t } = useI18n();
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
        <Muted>{t('reset.title')}</Muted>
      </View>

      {step === 'request' ? (
        <>
          <Muted>{t('reset.askEmail')}</Muted>
          <Field
            placeholder="email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {error && <Note tone="danger">{error}</Note>}
          <Button label={t('reset.getCode')} onPress={askCode} busy={busy} disabled={!emailReady} />
          <Button label={t('reset.backToLogin')} variant="quiet" onPress={onCancel} />
        </>
      ) : (
        <>
          <Note tone="ok">{ttl === null ? t('reset.issued') : t('reset.issuedTtl', { ttl })}</Note>
          {/* Честно: доставки писем ещё нет (см. ROADMAP), код лежит в БД. Без
              этой строки экран выглядит сломанным — письмо не приходит никогда. */}
          <Note tone="warn">{t('reset.noMail')}</Note>

          <Field
            placeholder={t('reset.codePlaceholder', { codeLength: CODE_LENGTH })}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
          />
          <Field
            placeholder={t('reset.passwordPlaceholder', { minPassword: MIN_PASSWORD })}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />

          {error && <Note tone="danger">{error}</Note>}

          <Button
            label={t('reset.change')}
            onPress={applyNewPassword}
            busy={busy}
            disabled={!confirmReady}
          />
          <Button label={t('reset.again')} variant="quiet" onPress={askCode} disabled={busy} />
          <Button label={t('reset.backToLogin')} variant="quiet" onPress={onCancel} />
        </>
      )}
    </Screen>
  );
}
