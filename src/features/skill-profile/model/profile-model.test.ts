import { describe, expect, it } from 'vitest';
import type { CoverageReport, ProfileArea, ProfileConcept, SkillProfile } from '@/shared/api';
import {
  addConcept,
  conceptCount,
  coverageLine,
  groupByStage,
  removeConcept,
  toggleOptional,
} from './profile-model';

const concept = (key: string, stage: string | null, prereqs: string[] = []): ProfileConcept => ({
  key,
  title: key.toUpperCase(),
  summary: '',
  stage,
  level: 'basic',
  optional: false,
  prereqs,
});

const area: ProfileArea = {
  key: 'goal',
  title: 'Цель',
  summary: '',
  role: 'goal',
  weight: 5,
  prereqs: [],
  stages: [
    { key: 's2', title: 'Методы', order: 2 },
    { key: 's1', title: 'Основы', order: 1 },
  ],
  concepts: [
    concept('a', 's1'),
    concept('b', 's2', ['a']),
    concept('c', null),
    concept('d', 'ghost'),
  ],
};
const profile: SkillProfile = { skill: 'Навык', level: 'apply', size: 32, areas: [area] };

describe('профиль навыка: правка', () => {
  it('понятия группируются по этапам в порядке этапов, остальные — отдельно', () => {
    const groups = groupByStage(area);
    expect(groups.map((g) => g.title)).toEqual(['Основы', 'Методы', 'Без этапа']);
    expect(groups[2].concepts.map((c) => c.key)).toEqual(['c', 'd']); // без этапа и с неизвестным этапом
  });

  it('пустой этап не показывается', () => {
    const a = { ...area, concepts: [concept('a', 's1')] };
    expect(groupByStage(a).map((g) => g.key)).toEqual(['s1']);
  });

  it('удаление понятия снимает его с предпосылок остальных', () => {
    const next = removeConcept(profile, 'goal', 'a');
    expect(next.areas[0].concepts.map((c) => c.key)).toEqual(['b', 'c', 'd']);
    expect(next.areas[0].concepts[0].prereqs).toEqual([]);
    expect(profile.areas[0].concepts).toHaveLength(4); // исходный профиль не тронут
  });

  it('«необязательное» переключается только у выбранного понятия', () => {
    const next = toggleOptional(profile, 'goal', 'b');
    expect(next.areas[0].concepts.map((c) => c.optional)).toEqual([false, true, false, false]);
    expect(toggleOptional(next, 'goal', 'b').areas[0].concepts[1].optional).toBe(false);
  });

  it('своё понятие добавляется в этап; пустое и повтор названия игнорируются', () => {
    const next = addConcept(profile, 'goal', 's1', '  Моё  ');
    const added = next.areas[0].concepts.at(-1);
    expect(added).toMatchObject({ title: 'Моё', stage: 's1', optional: false });
    expect(conceptCount(next)).toBe(5);
    expect(addConcept(next, 'goal', 's1', 'моё')).toBe(next);
    expect(addConcept(profile, 'goal', 's1', '   ')).toBe(profile);
  });

  it('ключи своих понятий не повторяются', () => {
    const once = addConcept(profile, 'goal', null, 'Раз');
    const twice = addConcept(once, 'goal', null, 'Два');
    const keys = twice.areas[0].concepts.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('итог полноты читается одной строкой', () => {
    const report: CoverageReport = {
      skill: 'Навык',
      areas: [],
      summary: { total: 10, verified: 2, missing: 4, coverage: 0.875 },
    };
    expect(coverageLine(report)).toBe('охвачено 88% · не хватает 4 · проверено 2');
    expect(
      coverageLine({ ...report, summary: { total: 1, verified: 0, missing: 0, coverage: 1 } }),
    ).toBe('охвачено 100%');
  });
});
