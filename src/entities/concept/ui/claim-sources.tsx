// Источники утверждений узла и «Здесь ошибка» (T-0154, T-0166, R-0072, R-0077).
// Под теорией: по нажатию — утверждения с названием источника, лицензией, страницей и ссылкой на оригинал.
// Цитата показывается, только если сервер её прислал (лицензия позволяет воспроизводить).
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { getNodeClaims, reportClaim, type NodeClaim } from '@/shared/api';
import { Body, Button, Card, Field, Muted, Note, space } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

type Load = { state: 'idle' } | { state: 'loading' } | { state: 'ready'; claims: NodeClaim[] };

export function ClaimSources({ conceptId }: { conceptId: string }) {
  const { t, lang, date } = useI18n();
  const [load, setLoad] = useState<Load>({ state: 'idle' });
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (load.state === 'ready') return;
    setLoad({ state: 'loading' });
    try {
      setLoad({ state: 'ready', claims: await getNodeClaims(conceptId, lang) });
    } catch {
      setLoad({ state: 'ready', claims: [] });
    }
  }

  async function send(claimId: string) {
    try {
      await reportClaim(claimId, note);
      setMessage({ tone: 'ok', text: t('claims.reportDone') });
      setReporting(null);
      setNote('');
    } catch {
      setMessage({ tone: 'danger', text: t('claims.reportFail') });
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Button
        label={open ? t('claims.hide') : t('claims.show')}
        variant="quiet"
        size="sm"
        onPress={() => void toggle()}
      />
      {message && <Note tone={message.tone}>{message.text}</Note>}
      {open && load.state === 'loading' && <Muted>{t('claims.loading')}</Muted>}
      {open && load.state === 'ready' && load.claims.length === 0 && (
        <Muted>{t('claims.none')}</Muted>
      )}
      {open &&
        load.state === 'ready' &&
        load.claims.map((c) => (
          <Card key={c.id}>
            <Body>{c.text}</Body>
            {c.applicability ? <Muted>{c.applicability}</Muted> : null}
            {c.asOf ? <Muted>{t('claims.asOf', { date: date(c.asOf) })}</Muted> : null}
            {c.reviewAfter ? (
              <Muted>{t('claims.reviewAfter', { date: date(c.reviewAfter) })}</Muted>
            ) : null}
            {c.sources.map((s, i) => (
              <View key={`${c.id}-${i}`} style={{ gap: space.xs }}>
                <Muted>
                  {[
                    s.title,
                    s.heading,
                    s.page ? t('claims.page', { page: s.page }) : null,
                    s.license ? t('claims.license', { license: s.license }) : null,
                    s.tier ? t('claims.tier', { tier: s.tier }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Muted>
                {s.quote ? <Note>“{s.quote}”</Note> : null}
                {s.linkDead ? <Note tone="warn">{t('claims.linkDead')}</Note> : null}
                {s.url && !s.linkDead ? (
                  <Button
                    label={t('claims.open')}
                    variant="quiet"
                    size="sm"
                    onPress={() => void Linking.openURL(s.url as string)}
                  />
                ) : null}
              </View>
            ))}
            {reporting === c.id ? (
              <View style={{ gap: space.sm }}>
                <Field
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('claims.reportNote')}
                  maxLength={500}
                />
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button
                    label={t('claims.reportSend')}
                    size="sm"
                    onPress={() => void send(c.id)}
                  />
                  <Button
                    label={t('claims.cancel')}
                    variant="quiet"
                    size="sm"
                    onPress={() => setReporting(null)}
                  />
                </View>
              </View>
            ) : (
              <Button
                label={t('claims.report')}
                variant="quiet"
                size="sm"
                onPress={() => {
                  setReporting(c.id);
                  setMessage(null);
                }}
              />
            )}
          </Card>
        ))}
    </View>
  );
}
