// Пул проблем для администратора (T-0158, R-0074): противоречия между утверждениями из разных
// источников и жалобы учащихся «здесь ошибка». Решение пересоберёт узел при следующей сборке области.
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  errorText,
  listProblems,
  listReports,
  rebuildDomain,
  resolveProblem,
  type ClaimProblem,
  type ClaimReports,
  type ProblemClaim,
  type ProblemResolution,
} from '@/shared/api';
import { Body, Button, Card, Chip, Label, Muted, Note, space } from '@/shared/ui';
import { useI18n, type Key } from '@/shared/i18n';

const RESOLUTIONS: { value: ProblemResolution; key: Key }[] = [
  { value: 'a', key: 'problems.resolve.a' },
  { value: 'b', key: 'problems.resolve.b' },
  { value: 'both', key: 'problems.resolve.both' },
  { value: 'disputed', key: 'problems.resolve.disputed' },
  { value: 'outdated', key: 'problems.resolve.outdated' },
];

function Side({ title, claim }: { title: string; claim: ProblemClaim }) {
  const { t } = useI18n();
  return (
    <View style={{ gap: space.xs }}>
      <Label>{title}</Label>
      <Body>{claim.text}</Body>
      {claim.sources.map((s, i) => (
        <Muted key={i}>
          {[
            s.document,
            s.heading,
            s.page ? t('claims.page', { page: s.page }) : null,
            s.tier ? t('claims.tier', { tier: s.tier }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Muted>
      ))}
      {claim.sources[0]?.quote ? <Note>“{claim.sources[0].quote}”</Note> : null}
    </View>
  );
}

export function ProblemPool() {
  const { t } = useI18n();
  const [state, setState] = useState<'open' | 'resolved'>('open');
  const [problems, setProblems] = useState<ClaimProblem[] | null>(null);
  const [reports, setReports] = useState<ClaimReports[]>([]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProblems(await listProblems(state));
      if (state === 'open') setReports(await listReports());
    } catch (e) {
      setProblems((prev) => prev ?? []);
      setMessage({ tone: 'danger', text: errorText(e) });
    }
  }, [state]);

  useEffect(() => {
    setProblems(null);
    void refresh();
  }, [refresh]);

  async function decide(p: ClaimProblem, resolution: ProblemResolution) {
    try {
      await resolveProblem(p.id, resolution);
      setProblems((prev) => (prev ?? []).filter((x) => x.id !== p.id));
      setMessage({
        tone: 'ok',
        text: t('problems.done', { resolution: t(`problems.resolve.${resolution}` as Key) }),
      });
    } catch (e) {
      setMessage({ tone: 'danger', text: errorText(e) });
    }
  }

  async function rebuild(domain: string) {
    try {
      await rebuildDomain(domain);
      setMessage({ tone: 'ok', text: t('problems.rebuildQueued') });
    } catch (e) {
      setMessage({ tone: 'danger', text: errorText(e) });
    }
  }

  const domains = [...new Set((problems ?? []).map((p) => p.domain).filter(Boolean))] as string[];

  return (
    <View style={{ gap: space.md }}>
      <Muted>{t('problems.intro')}</Muted>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip
          text={t('problems.open')}
          selected={state === 'open'}
          onPress={() => setState('open')}
        />
        <Chip
          text={t('problems.resolved')}
          selected={state === 'resolved'}
          onPress={() => setState('resolved')}
        />
      </View>
      {message && <Note tone={message.tone}>{message.text}</Note>}
      {problems === null && <Muted>{t('problems.loading')}</Muted>}
      {problems?.length === 0 && (
        <Muted>{state === 'open' ? t('problems.empty') : t('problems.emptyResolved')}</Muted>
      )}
      {(problems ?? []).map((p) => (
        <Card key={p.id}>
          <Label>{[p.domain, p.concept].filter(Boolean).join(' · ')}</Label>
          {p.reason ? <Note tone="warn">{t('problems.reason', { reason: p.reason })}</Note> : null}
          <Side title={t('problems.sideA')} claim={p.a} />
          <Side title={t('problems.sideB')} claim={p.b} />
          {state === 'open' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {RESOLUTIONS.map((r) => (
                <Button
                  key={r.value}
                  label={t(r.key)}
                  variant="quiet"
                  size="sm"
                  onPress={() => void decide(p, r.value)}
                />
              ))}
            </View>
          ) : (
            <Muted>
              {t('problems.done', { resolution: t(`problems.resolve.${p.resolution}` as Key) })}
            </Muted>
          )}
        </Card>
      ))}
      {state === 'open' && domains.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {domains.map((d) => (
            <Button
              key={d}
              label={`${t('problems.rebuild')}: ${d}`}
              variant="quiet"
              size="sm"
              onPress={() => void rebuild(d)}
            />
          ))}
        </View>
      )}
      {state === 'open' && (
        <View style={{ gap: space.sm }}>
          <Label>{t('problems.reports')}</Label>
          {reports.length === 0 && <Muted>{t('problems.noReports')}</Muted>}
          {reports.map((r) => (
            <Card key={r.claimId}>
              <Label>
                {[r.concept, t('problems.reportsCount', { count: r.reports })]
                  .filter(Boolean)
                  .join(' · ')}
              </Label>
              <Body>{r.text}</Body>
              {r.notes.map((n, i) => (
                <Muted key={i}>— {n}</Muted>
              ))}
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}
