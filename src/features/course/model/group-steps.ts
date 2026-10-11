// Путь курса по областям и этапам (R-0065, T-0122): порядок шагов не меняется, меняется только группировка.
import type { CourseStep } from '@/shared/api';

export interface StepGroup {
  key: string;
  title: string;
  steps: { step: CourseStep; index: number }[];
}

export interface AreaGroup {
  key: string;
  title: string;
  stages: StepGroup[];
  total: number;
  done: number;
}

/** Область → этап → шаги в порядке прихода; сквозной номер шага сохраняется. */
export function groupSteps(steps: CourseStep[]): AreaGroup[] {
  const areas: AreaGroup[] = [];
  steps.forEach((step, i) => {
    const areaKey = step.domain ?? '';
    let area = areas.find((a) => a.key === areaKey);
    if (!area) {
      area = { key: areaKey, title: areaKey || 'Путь', stages: [], total: 0, done: 0 };
      areas.push(area);
    }
    const stageKey = step.stage ?? '';
    let stage = area.stages.find((s) => s.key === stageKey);
    if (!stage) {
      stage = { key: stageKey, title: stageKey || 'Прочее', steps: [] };
      area.stages.push(stage);
    }
    stage.steps.push({ step, index: i + 1 });
    area.total += 1;
    if (step.done) area.done += 1;
  });
  return areas;
}
