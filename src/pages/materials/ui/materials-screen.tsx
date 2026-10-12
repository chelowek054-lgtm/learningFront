// Мои материалы (T-0014): загрузить PDF/Markdown, прочитать по фрагментам, в том числе офлайн.
// Из материала строятся личные узлы графа (T-0015) и вопросы для самопроверки (T-0016):
// узлы предлагаются и добавляются только после подтверждения, на фрагменты они ссылаются.
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { KNOWLEDGE_MODULE_ID } from '@/entities/module';
import { useSession } from '@/entities/session';
import {
  acceptFromMaterial,
  deleteMaterial,
  dropCachedMaterial,
  getLocalStore,
  loadMaterial,
  loadMaterialList,
  proposeFromMaterial,
  questionsFromMaterial,
  syncNow,
  uploadErrorMessage,
  uploadMaterial,
  type MaterialFull,
  type MaterialProposal,
  type MaterialSummary,
} from '@/shared/api';
import {
  Body,
  Button,
  Card,
  Empty,
  Label,
  Lead,
  Muted,
  Note,
  Progress,
  Screen,
  TopBar,
} from '@/shared/ui';
import { useI18n } from '@/shared/i18n';

export function MaterialsScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const { subject } = useSession();
  const [proposal, setProposal] = useState<MaterialProposal | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [info, setInfo] = useState<string | null>(null);
  const [items, setItems] = useState<MaterialSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [open, setOpen] = useState<{ material: MaterialFull; offline: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await loadMaterialList(getLocalStore());
      setItems(r.items);
      setOffline(r.offline);
    } catch (e) {
      setItems([]);
      setError(uploadErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function pickAndUpload() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/markdown', 'text/plain', 'text/x-markdown'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || res.assets.length === 0) return;
    const asset = res.assets[0];
    setProgress(0);
    try {
      await uploadMaterial(
        {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
          file: asset.file,
        },
        { module: KNOWLEDGE_MODULE_ID, onProgress: setProgress },
      );
      await refresh();
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      setProgress(null);
    }
  }

  async function read(id: string) {
    setError(null);
    setBusy(true);
    try {
      setOpen(await loadMaterial(getLocalStore(), id));
    } catch {
      setError(t('materialsMaterialsScreen.1'));
    } finally {
      setBusy(false);
    }
  }

  async function propose(id: string) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const p = await proposeFromMaterial(id);
      setProposal(p);
      setChosen(new Set(p.nodes.map((n) => n.key)));
      if (p.nodes.length === 0) setInfo(t('materialsMaterialsScreen.2'));
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function accept(id: string) {
    if (!proposal || !subject) return;
    setBusy(true);
    try {
      const keys = chosen;
      const nodes = proposal.nodes.filter((n) => keys.has(n.key));
      const edges = proposal.edges.filter((e) => keys.has(e.from) && keys.has(e.to));
      const r = await acceptFromMaterial(id, subject.id, { nodes, edges });
      setInfo(t('materialsMaterialsScreen.3', { created: r.created }));
      setProposal(null);
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function makeQuestions(id: string) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const r = await questionsFromMaterial(id);
      await syncNow(getLocalStore()).catch(() => undefined);
      setInfo(
        r.created > 0
          ? t('materialsMaterialsScreen.4', { created: r.created })
          : t('materialsMaterialsScreen.5'),
      );
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteMaterial(id);
      await dropCachedMaterial(getLocalStore(), id);
      setOpen(null);
      setConfirmDelete(false);
      await refresh();
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (open) {
    const { material } = open;
    const fragments = material.content.fragments ?? [];
    return (
      <Screen>
        <TopBar
          title={t('materialsMaterialsScreen.6')}
          onBack={() => {
            setOpen(null);
            setConfirmDelete(false);
            setProposal(null);
            setInfo(null);
          }}
        />
        <Lead>{material.title}</Lead>
        {open.offline && <Note tone="warn">{t('materialsMaterialsScreen.7')}</Note>}
        {!open.offline && (
          <>
            {subject ? (
              <Button
                label={t('materialsMaterialsScreen.8')}
                onPress={() => void propose(material.id)}
                busy={busy}
              />
            ) : (
              <Muted>{t('materialsMaterialsScreen.9')}</Muted>
            )}
            <Button
              label={t('materialsMaterialsScreen.10')}
              variant="quiet"
              onPress={() => void makeQuestions(material.id)}
              busy={busy}
            />
          </>
        )}
        {info && <Note tone="ok">{info}</Note>}
        {proposal && proposal.nodes.length > 0 && (
          <Card tone="accent">
            <Label>{t('materialsMaterialsScreen.11')}</Label>
            {proposal.truncated && <Muted>{t('materialsMaterialsScreen.12')}</Muted>}
            {proposal.nodes.map((n) => {
              const on = chosen.has(n.key);
              return (
                <Card
                  key={n.key}
                  onPress={() =>
                    setChosen((prev) => {
                      const next = new Set(prev);
                      if (next.has(n.key)) next.delete(n.key);
                      else next.add(n.key);
                      return next;
                    })
                  }
                >
                  <Body>
                    {on ? '✓ ' : '○ '}
                    {n.title}
                  </Body>
                  <Muted>{n.summary}</Muted>
                </Card>
              );
            })}
            <Button
              label={t('materialsMaterialsScreen.13', { size: chosen.size })}
              onPress={() => void accept(material.id)}
              busy={busy}
              disabled={chosen.size === 0}
            />
            <Button
              label={t('materialsMaterialsScreen.14')}
              variant="quiet"
              onPress={() => setProposal(null)}
            />
          </Card>
        )}
        {fragments.map((f) => (
          <Card key={f.id}>
            {(f.heading || f.page) && (
              <Label>
                {[f.heading, f.page ? t('materialsMaterialsScreen.15', { page: f.page }) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Label>
            )}
            <Body>{f.text}</Body>
          </Card>
        ))}
        {material.mine &&
          (confirmDelete ? (
            <>
              <Note tone="danger">{t('materialsMaterialsScreen.16')}</Note>
              <Button
                label={t('materialsMaterialsScreen.17')}
                variant="danger"
                onPress={() => void remove(material.id)}
                busy={busy}
              />
              <Button
                label={t('materialsMaterialsScreen.18')}
                variant="quiet"
                onPress={() => setConfirmDelete(false)}
              />
            </>
          ) : (
            <Button
              label={t('materialsMaterialsScreen.19')}
              variant="quiet"
              onPress={() => setConfirmDelete(true)}
            />
          ))}
        {error && <Note tone="danger">{error}</Note>}
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={t('materialsMaterialsScreen.20')} onBack={onBack} />
      <Muted>{t('materialsMaterialsScreen.21')}</Muted>
      <Button
        label={t('materialsMaterialsScreen.22')}
        onPress={() => void pickAndUpload()}
        busy={progress !== null}
        disabled={offline}
      />
      {progress !== null && <Progress value={progress} />}
      {offline && <Note tone="warn">{t('materialsMaterialsScreen.23')}</Note>}
      {error && <Note tone="danger">{error}</Note>}

      {items === null && <ActivityIndicator />}
      {items?.length === 0 && <Empty text={t('materialsMaterialsScreen.24')} />}
      {items?.map((m) => (
        <Card key={m.id} onPress={() => void read(m.id)}>
          <Lead>{m.title}</Lead>
          <Muted>
            {m.source === 'pdf'
              ? 'PDF'
              : m.source === 'markdown'
                ? t('materialsMaterialsScreen.25')
                : t('materialsMaterialsScreen.6')}
            {m.pages ? t('materialsMaterialsScreen.26', { pages: m.pages }) : ''}
            {m.fragmentCount !== null
              ? t('materialsMaterialsScreen.27', { fragmentCount: m.fragmentCount })
              : ''}
            {m.mine ? '' : t('materialsMaterialsScreen.28')}
          </Muted>
        </Card>
      ))}
    </Screen>
  );
}
