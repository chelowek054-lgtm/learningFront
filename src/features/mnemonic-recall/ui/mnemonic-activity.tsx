// Рендерер `concept_mnemonic` (T-0063): вспомнить формулировку по первым буквам и самому оценить.
// Работает офлайн: подсказка и ответ лежат в payload; результат уходит свидетельством
// об освоении в общем формате и ждёт в очереди, если связи нет.
import { useState } from 'react';
import { View } from 'react-native';
import { getLocalStore, submitEvidence } from '@/shared/api';
import type { ActivityRendererProps } from '@/shared/engine';
import { Body, Button, Lead, Muted, Note, space, Title } from '@/shared/ui';
import { MNEMONIC_SOURCE, SELF_RATINGS, scoreOf, type SelfRating } from '../model/rating';
import { useI18n } from '@/shared/i18n';

interface Payload {
  title?: string;
  domain?: string;
  conceptId?: string;
  cue?: string;
  answer?: string;
}

export function MnemonicActivity({ activity, onComplete }: ActivityRendererProps) {
  const { t } = useI18n();
  const payload = activity.payload as Payload;
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rate(rating: SelfRating) {
    if (!payload.domain || !payload.conceptId) return;
    setBusy(true);
    setError(null);
    try {
      const state = await submitEvidence(getLocalStore(), {
        domain: payload.domain,
        conceptId: payload.conceptId,
        bloom: 'remember',
        score: scoreOf(rating),
        source: MNEMONIC_SOURCE,
      });
      setNote(state === 'queued' ? t('mnemonicRecallMnemonicActivity.1') : null);
      onComplete({ activityId: activity.id, userAnswer: { rating } });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!payload.cue) return <Muted>{t('mnemonicRecallMnemonicActivity.2')}</Muted>;

  return (
    <View style={{ gap: space.md }}>
      <Title>{payload.title ?? t('mnemonicRecallMnemonicActivity.3')}</Title>
      <Muted>{t('mnemonicRecallMnemonicActivity.4')}</Muted>
      <Lead>{payload.cue}</Lead>

      {revealed ? (
        <>
          <Body>{payload.answer}</Body>
          <Muted>{t('mnemonicRecallMnemonicActivity.5')}</Muted>
          {SELF_RATINGS.map((r) => (
            <Button
              key={r.key}
              label={r.label}
              variant={r.key === 'easy' ? 'primary' : 'quiet'}
              onPress={() => void rate(r.key)}
              disabled={busy}
            />
          ))}
        </>
      ) : (
        <Button label={t('mnemonicRecallMnemonicActivity.6')} onPress={() => setRevealed(true)} />
      )}

      {note && <Note tone="warn">{note}</Note>}
      {error && <Note tone="danger">{error}</Note>}
    </View>
  );
}
