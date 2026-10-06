import { describe, expect, it } from 'vitest';
import type { SourceGap } from '@/shared/api';
import { canSearch, effectiveQuery, gapsNeedPolling, resultLine } from './gaps-model';

const gap = (over: Partial<SourceGap> = {}): SourceGap => ({
  key: 'deep',
  title: 'Deep',
  query: 'deep',
  state: 'idle',
  documents: [],
  ...over,
});

describe('пробелы в графе', () => {
  it('отправляется правка администратора, а пустая правка заменяется готовым запросом', () => {
    expect(effectiveQuery(gap(), '  deep calculus  ')).toBe('deep calculus');
    expect(effectiveQuery(gap(), '   ')).toBe('deep');
    expect(effectiveQuery(gap())).toBe('deep');
  });

  it('область с идущим разбором запускать нельзя', () => {
    expect(canSearch(gap())).toBe(true);
    expect(canSearch(gap({ state: 'running' }))).toBe(false);
  });

  it('опрос нужен, пока хоть одна область в работе', () => {
    expect(gapsNeedPolling([gap(), gap({ state: 'running' })])).toBe(true);
    expect(gapsNeedPolling([gap()])).toBe(false);
  });

  it('итог запуска называет статус и число документов', () => {
    const queued = [{ documentId: 'd', title: 't', created: true }];
    expect(resultLine({ status: 'queued', queued })).toBe('поставлено в разбор: документов 1');
    expect(resultLine({ status: 'already_running', queued: [] })).toBe(
      'разбор по области уже идёт',
    );
  });
});
