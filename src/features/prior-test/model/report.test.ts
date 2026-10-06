import { describe, expect, it } from 'vitest';
import type { PriorReport } from '@/shared/api';
import { areaLine, hasAreas, summaryLine, verdictTone, VERDICT_LABEL } from './report';

const report = (over: Partial<PriorReport> = {}): PriorReport => ({
  goal: 'top',
  registered: true,
  target: 'understand',
  areas: [],
  summary: {},
  ...over,
});

describe('отчёт по предварительным знаниям', () => {
  it('у каждого вердикта есть подпись и тон', () => {
    expect(VERDICT_LABEL.enough).toBe('Хватает');
    expect(verdictTone('enough')).toBe('core');
    expect(verdictTone('partial')).toBe('accent');
    expect(verdictTone('no_graph')).toBe('muted');
  });

  it('сводка перечисляет только непустые вердикты по порядку', () => {
    expect(summaryLine({ partial: 1, enough: 2, unchecked: 0 })).toBe('Хватает: 2 · Мало: 1');
    expect(summaryLine({})).toBe('');
  });

  it('строка области считает освоенное и отмечает черновики и отсутствие в графе', () => {
    expect(areaLine({ needed: 3, known: 2, drafts: 0, verdict: 'partial' })).toBe(
      'освоено 2 из 3 нужных',
    );
    expect(areaLine({ needed: 3, known: 0, drafts: 2, verdict: 'unchecked' })).toBe(
      'освоено 0 из 3 нужных · черновых понятий: 2',
    );
    expect(areaLine({ needed: 0, known: 0, drafts: 0, verdict: 'no_graph' })).toBe(
      'в графе нет понятий',
    );
  });

  it('отчёт без областей или по незарегистрированной цели не показывается', () => {
    expect(hasAreas(null)).toBe(false);
    expect(hasAreas(report())).toBe(false);
    expect(hasAreas(report({ registered: false }))).toBe(false);
    const a = {
      key: 'base',
      title: 'База',
      level: 0,
      verdict: 'enough',
      needed: 1,
      known: 1,
      answered: 1,
      concepts: 1,
      drafts: 0,
    } as const;
    expect(hasAreas(report({ areas: [a] }))).toBe(true);
  });
});
