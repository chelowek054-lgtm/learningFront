// Панель источников для администратора (T-0079): форма загрузки учебника и список с ходом разбора.
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  deleteSource,
  listSources,
  sourceErrorMessage,
  uploadSource,
  type SourceItem,
} from '@/shared/api';
import { Body, Button, Card, Field, Label, Muted, Note, Progress, space } from '@/shared/ui';
import {
  canUpload,
  cleanFields,
  fraction,
  shouldPoll,
  STATUS_LABEL,
  summaryLine,
  uploadResult,
} from '../model/sources-model';
import { useI18n } from '@/shared/i18n';

const POLL_MS = 5000;

export function SourcesPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<SourceItem[] | null>(null);
  const [domain, setDomain] = useState('');
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('');
  const [license, setLicense] = useState('');
  const [originUrl, setOriginUrl] = useState('');
  const [sent, setSent] = useState<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await listSources());
    } catch (e) {
      setItems((prev) => prev ?? []);
      setError(sourceErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Пока документ в очереди или разбирается, список обновляется сам.
  useEffect(() => {
    if (!items || !shouldPoll(items)) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [items, refresh]);

  const fields = cleanFields({ domain, title, level, license, originUrl });

  async function pickAndUpload() {
    setError(null);
    setInfo(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/markdown', 'text/plain', 'text/x-markdown'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || res.assets.length === 0) return;
    const asset = res.assets[0];
    setSent(0);
    try {
      const r = await uploadSource(
        {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
          file: asset.file,
        },
        fields,
        setSent,
      );
      setInfo(uploadResult(r));
      await refresh();
    } catch (e) {
      setError(sourceErrorMessage(e));
    } finally {
      setSent(null);
    }
  }

  async function remove(id: string) {
    setError(null);
    setConfirm(null);
    try {
      const r = await deleteSource(id);
      setInfo(
        t('sourcesSourcesPanel.1', { conceptsDeleted: r.conceptsDeleted }) +
          (r.conceptsRejected
            ? t('sourcesSourcesPanel.2', { conceptsRejected: r.conceptsRejected })
            : ''),
      );
      await refresh();
    } catch (e) {
      setError(sourceErrorMessage(e));
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Label>{t('sourcesSourcesPanel.3')}</Label>
        <Muted>{t('sourcesSourcesPanel.4')}</Muted>
        <Field placeholder={t('sourcesSourcesPanel.5')} value={domain} onChangeText={setDomain} />
        <Field placeholder={t('sourcesSourcesPanel.6')} value={title} onChangeText={setTitle} />
        <Field placeholder={t('sourcesSourcesPanel.7')} value={level} onChangeText={setLevel} />
        <Field placeholder={t('sourcesSourcesPanel.8')} value={license} onChangeText={setLicense} />
        <Field
          placeholder={t('sourcesSourcesPanel.9')}
          value={originUrl}
          onChangeText={setOriginUrl}
        />
        {sent !== null && <Progress value={sent} />}
        {error && <Note tone="danger">{error}</Note>}
        {info && <Note tone="ok">{info}</Note>}
        <Button
          label={sent !== null ? t('sourcesSourcesPanel.10') : t('sourcesSourcesPanel.11')}
          onPress={() => void pickAndUpload()}
          disabled={!canUpload(fields) || sent !== null}
        />
      </Card>

      <Label>{t('sourcesSourcesPanel.12')}</Label>
      {items === null && <Muted>{t('sourcesSourcesPanel.13')}</Muted>}
      {items?.length === 0 && <Muted>{t('sourcesSourcesPanel.14')}</Muted>}
      {items?.map((item) => (
        <Card key={item.id}>
          <Body>{item.title}</Body>
          <Muted>
            {[item.domain, item.level, item.license].filter(Boolean).join(' · ') ||
              t('sourcesSourcesPanel.15')}
          </Muted>
          <Muted>{STATUS_LABEL[item.progress.status]}</Muted>
          {item.progress.status !== 'new' && <Progress value={fraction(item.progress)} />}
          {summaryLine(item.progress) !== '' && <Muted>{summaryLine(item.progress)}</Muted>}
          {item.progress.error && <Note tone="danger">{item.progress.error}</Note>}
          {confirm === item.id ? (
            <>
              <Note tone="warn">{t('sourcesSourcesPanel.16')}</Note>
              <Button label={t('sourcesSourcesPanel.17')} onPress={() => void remove(item.id)} />
              <Button
                label={t('sourcesSourcesPanel.18')}
                variant="quiet"
                onPress={() => setConfirm(null)}
              />
            </>
          ) : (
            <Button
              label={t('sourcesSourcesPanel.19')}
              variant="quiet"
              onPress={() => setConfirm(item.id)}
            />
          )}
        </Card>
      ))}
    </View>
  );
}
