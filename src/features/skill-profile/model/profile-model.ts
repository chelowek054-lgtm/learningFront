// Правка профиля навыка (T-0093): что показать и как менять, без сети и без UI.
import type {
  ConceptLevel,
  CoverageReport,
  ProfileArea,
  ProfileConcept,
  SkillProfile,
} from '@/shared/api';

export const LEVEL_LABEL: Record<ConceptLevel, string> = {
  basic: 'база',
  middle: 'средний',
  advanced: 'продвинутый',
};

export interface StageGroup {
  key: string | null;
  title: string;
  concepts: ProfileConcept[];
}

/** Понятия области по этапам в порядке этапов; без этапа — отдельной группой в конце. */
export function groupByStage(area: ProfileArea): StageGroup[] {
  const groups: StageGroup[] = [...area.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      key: s.key,
      title: s.title,
      concepts: area.concepts.filter((c) => c.stage === s.key),
    }));
  const loose = area.concepts.filter(
    (c) => !c.stage || !area.stages.some((s) => s.key === c.stage),
  );
  if (loose.length > 0) groups.push({ key: null, title: 'Без этапа', concepts: loose });
  return groups.filter((g) => g.concepts.length > 0);
}

const mapArea = (
  profile: SkillProfile,
  areaKey: string,
  change: (a: ProfileArea) => ProfileArea,
): SkillProfile => ({
  ...profile,
  areas: profile.areas.map((a) => (a.key === areaKey ? change(a) : a)),
});

/** Убрать понятие; те, кто на него опирался, теряют эту предпосылку, а не ссылку в пустоту. */
export const removeConcept = (profile: SkillProfile, areaKey: string, conceptKey: string) =>
  mapArea(profile, areaKey, (a) => ({
    ...a,
    concepts: a.concepts
      .filter((c) => c.key !== conceptKey)
      .map((c) => ({ ...c, prereqs: c.prereqs.filter((p) => p !== conceptKey) })),
  }));

export const toggleOptional = (profile: SkillProfile, areaKey: string, conceptKey: string) =>
  mapArea(profile, areaKey, (a) => ({
    ...a,
    concepts: a.concepts.map((c) => (c.key === conceptKey ? { ...c, optional: !c.optional } : c)),
  }));

/** Добавить своё понятие в этап области; ключ уникален внутри области. */
export function addConcept(
  profile: SkillProfile,
  areaKey: string,
  stageKey: string | null,
  title: string,
): SkillProfile {
  const clean = title.trim();
  if (!clean) return profile;
  const target = profile.areas.find((x) => x.key === areaKey);
  if (!target || target.concepts.some((c) => c.title.toLowerCase() === clean.toLowerCase())) {
    return profile;
  }
  return mapArea(profile, areaKey, (a) => {
    let n = a.concepts.length + 1;
    while (a.concepts.some((c) => c.key === `own_${n}`)) n += 1;
    const concept: ProfileConcept = {
      key: `own_${n}`,
      title: clean,
      summary: clean,
      stage: stageKey,
      level: null,
      optional: false,
      prereqs: [],
    };
    return { ...a, concepts: [...a.concepts, concept] };
  });
}

export const conceptCount = (profile: SkillProfile): number =>
  profile.areas.reduce((n, a) => n + a.concepts.length, 0);

/** «Охвачено 87% · не хватает 4 · проверено 2» — итог отчёта полноты одной строкой. */
export function coverageLine(report: CoverageReport): string {
  const s = report.summary;
  const parts = [`охвачено ${Math.round(s.coverage * 100)}%`];
  if (s.missing > 0) parts.push(`не хватает ${s.missing}`);
  if (s.verified > 0) parts.push(`проверено ${s.verified}`);
  return parts.join(' · ');
}
