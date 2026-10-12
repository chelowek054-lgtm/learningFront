// Пробелы в графе под целью (T-0084): администратор видит области без понятий, правит готовый запрос
// и одним действием запускает поиск по белому списку и разбор.
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  fillSourceGaps,
  listSourceGaps,
  sourceErrorMessage,
  type GapFillResult,
  type SourceGap,
} from '@/shared/api';
import { Body, Button, Card, Field, Label, Muted, Note, space } from '@/shared/ui';
import { canSearch, effectiveQuery, gapsNeedPolling, resultLine } from '../model/gaps-model';
import { STATUS_LABEL } from '../model/sources-model';
import { useI18n } from '@/shared/i18n';

const POLL_MS = 5000;

export function GapsCard({ goal }: { goal: string }) {
  const { t } = useI18n();
  const [gaps, setGaps] = useState<SourceGap[] | null>(null);
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, GapFillResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setGaps((await listSourceGaps(goal)).gaps);
    } catch (e) {
      setGaps((prev) => prev ?? []);
      setError(sourceErrorMessage(e));
    }
  }, [goal]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!gaps || !gapsNeedPolling(gaps)) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [gaps, refresh]);

  async function search(gap: SourceGap) {
    setBusy(gap.key);
    setError(null);
    try {
      const { results: out } = await fillSourceGaps(goal, [
        { area: gap.key, query: effectiveQuery(gap, queries[gap.key]) },
      ]);
      setResults((prev) => ({ ...prev, ...Object.fromEntries(out.map((r) => [r.area, r])) }));
      await refresh();
    } catch (e) {
      setError(sourceErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (gaps === null) return <Muted>{t('sourcesGapsCard.1')}</Muted>;
  if (gaps.length === 0) {
    return (
      <Card>
        <Label>{t('sourcesGapsCard.2')}</Label>
        <Muted>{t('sourcesGapsCard.3')}</Muted>
        {error && <Note tone="danger">{error}</Note>}
      </Card>
    );
  }
  return (
    <View style={{ gap: space.md }}>
      <Label>{t('sourcesGapsCard.2')}</Label>
      <Muted>
        {t('sourcesGapsCard.4', { goal })}
        по белому списку доменов; найденное попадает в граф черновиками.
      </Muted>
      {error && <Note tone="danger">{error}</Note>}
      {gaps.map((gap) => {
        const result = results[gap.key];
        return (
          <Card key={gap.key}>
            <Body>{gap.title}</Body>
            <Field
              placeholder={t('sourcesGapsCard.5')}
              value={queries[gap.key] ?? gap.query}
              onChangeText={(v) => setQueries((prev) => ({ ...prev, [gap.key]: v }))}
            />
            {gap.documents.map((d) => (
              <Muted key={d.documentId}>
                {d.title}: {STATUS_LABEL[d.status].toLowerCase()}
              </Muted>
            ))}
            {result && <Note tone="ok">{resultLine(result)}</Note>}
            <Button
              label={
                !canSearch(gap)
                  ? t('sourcesGapsCard.6')
                  : busy === gap.key
                    ? t('sourcesGapsCard.7')
                    : t('sourcesGapsCard.8')
              }
              onPress={() => void search(gap)}
              disabled={!canSearch(gap) || busy !== null}
            />
          </Card>
        );
      })}
    </View>
  );
}
