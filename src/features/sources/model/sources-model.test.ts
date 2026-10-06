import { describe, expect, it } from 'vitest';
import type { SourceItem, SourceProgress } from '@/shared/api';
import {
  canUpload,
  cleanFields,
  fraction,
  shouldPoll,
  summaryLine,
  uploadResult,
} from './sources-model';

const progress = (over: Partial<SourceProgress> = {}): SourceProgress => ({
  documentId: 'd',
  title: 'Algebra',
  status: 'running',
  fragments: 10,
  pages: 100,
  windows: 8,
  windowsDone: 2,
  truncated: false,
  concepts: 0,
  drafts: 0,
  verified: 0,
  dropped: 0,
  error: null,
  ...over,
});

const item = (p: SourceProgress): SourceItem => ({
  id: 'd',
  title: 'Algebra',
  domain: 'algebra',
  level: null,
  license: null,
  originUrl: null,
  createdAt: null,
  progress: p,
});

describe('источники знаний', () => {
  it('доля готовых окон: готовый документ — целиком, без окон — ноль', () => {
    expect(fraction(progress())).toBe(0.25);
    expect(fraction(progress({ status: 'done', windowsDone: 3 }))).toBe(1);
    expect(fraction(progress({ status: 'queued', windows: 0, windowsDone: 0 }))).toBe(0);
    expect(fraction(progress({ windowsDone: 99 }))).toBe(1);
  });

  it('строка под полосой называет окна, понятия, отброшенное и усечение', () => {
    expect(summaryLine(progress())).toBe('окон 2 из 8');
    const line = summaryLine(
      progress({ concepts: 12, drafts: 10, verified: 2, dropped: 3, truncated: true }),
    );
    expect(line).toContain('понятий 12 (10 черновиков, 2 проверено)');
    expect(line).toContain('отброшено 3');
    expect(line).toContain('только часть книги');
    expect(summaryLine(progress({ windows: 0, windowsDone: 0 }))).toBe('');
  });

  it('список обновляется сам, пока что-то в очереди или идёт', () => {
    expect(shouldPoll([item(progress({ status: 'queued' }))])).toBe(true);
    expect(shouldPoll([item(progress({ status: 'running' }))])).toBe(true);
    expect(
      shouldPoll([item(progress({ status: 'done' })), item(progress({ status: 'failed' }))]),
    ).toBe(false);
    expect(shouldPoll([])).toBe(false);
  });

  it('без области загружать нельзя, пустые поля не уходят на сервер', () => {
    expect(canUpload({ domain: ' ' })).toBe(false);
    expect(canUpload({ domain: 'algebra' })).toBe(true);
    expect(
      cleanFields({ domain: ' algebra ', title: ' ', level: 'B2', license: '', originUrl: '' }),
    ).toEqual({ domain: 'algebra', level: 'B2' });
  });

  it('после загрузки человеку говорят, новый это документ или повтор', () => {
    expect(uploadResult({ created: true, title: 'A', status: 'queued' })).toContain(
      'поставлен в разбор',
    );
    expect(uploadResult({ created: false, title: 'A', status: 'done' })).toContain('уже разобран');
    expect(uploadResult({ created: false, title: 'A', status: 'running' })).toContain(
      'разбирается',
    );
  });
});
