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

const POLL_MS = 5000;

export function SourcesPanel() {
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
        `Источник удалён вместе с выведенным только из него: понятий ${r.conceptsDeleted}` +
          (r.conceptsRejected ? `, отклонено ${r.conceptsRejected} (по ним уже учатся)` : ''),
      );
      await refresh();
    } catch (e) {
      setError(sourceErrorMessage(e));
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <Card>
        <Label>Загрузить учебник</Label>
        <Muted>
          PDF с текстовым слоем, Markdown или текст. Понятия, найденные в книге, попадают в граф
          черновиками, пока специалист их не проверит.
        </Muted>
        <Field
          placeholder="область, например: algebra (обязательно)"
          value={domain}
          onChangeText={setDomain}
        />
        <Field
          placeholder="название (если пусто — из файла)"
          value={title}
          onChangeText={setTitle}
        />
        <Field placeholder="уровень, например: B2" value={level} onChangeText={setLevel} />
        <Field
          placeholder="лицензия, например: CC BY-SA"
          value={license}
          onChangeText={setLicense}
        />
        <Field placeholder="адрес источника" value={originUrl} onChangeText={setOriginUrl} />
        {sent !== null && <Progress value={sent} />}
        {error && <Note tone="danger">{error}</Note>}
        {info && <Note tone="ok">{info}</Note>}
        <Button
          label={sent !== null ? 'Загружаю…' : 'Выбрать файл и загрузить'}
          onPress={() => void pickAndUpload()}
          disabled={!canUpload(fields) || sent !== null}
        />
      </Card>

      <Label>Источники</Label>
      {items === null && <Muted>Загружаю список…</Muted>}
      {items?.length === 0 && <Muted>Источников пока нет.</Muted>}
      {items?.map((item) => (
        <Card key={item.id}>
          <Body>{item.title}</Body>
          <Muted>
            {[item.domain, item.level, item.license].filter(Boolean).join(' · ') ||
              'без метаданных'}
          </Muted>
          <Muted>{STATUS_LABEL[item.progress.status]}</Muted>
          {item.progress.status !== 'new' && <Progress value={fraction(item.progress)} />}
          {summaryLine(item.progress) !== '' && <Muted>{summaryLine(item.progress)}</Muted>}
          {item.progress.error && <Note tone="danger">{item.progress.error}</Note>}
          {confirm === item.id ? (
            <>
              <Note tone="warn">
                Удалить источник вместе со всем, что выведено только из него? По понятиям, на
                которые уже ссылаются люди, понятие не удаляется, а отклоняется.
              </Note>
              <Button label="Да, удалить" onPress={() => void remove(item.id)} />
              <Button label="Отмена" variant="quiet" onPress={() => setConfirm(null)} />
            </>
          ) : (
            <Button label="Удалить источник" variant="quiet" onPress={() => setConfirm(item.id)} />
          )}
        </Card>
      ))}
    </View>
  );
}
