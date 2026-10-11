// Аккордеон «Весь путь»: область → этап → шаги; свёрнутость запоминается на устройстве (R-0065, T-0122).
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CourseStep } from '@/shared/api';
import { rememberFlag, remembered } from '@/shared/lib';
import { Card, Label, Muted, space } from '@/shared/ui';
import { groupSteps } from '../model/group-steps';

export function PathAccordion({
  steps,
  currentId,
  renderStep,
}: {
  steps: CourseStep[];
  currentId: string | null;
  renderStep: (step: CourseStep, index: number) => ReactNode;
}) {
  const [, force] = useState(0);
  const areas = groupSteps(steps);

  // По умолчанию раскрыто то, где текущий шаг; выбор человека запоминается.
  const isOpen = (key: string, hasCurrent: boolean) => remembered(`path:${key}`, hasCurrent);
  const toggle = (key: string, hasCurrent: boolean) => {
    rememberFlag(`path:${key}`, !isOpen(key, hasCurrent));
    force((n) => n + 1);
  };

  return (
    <View style={{ gap: space.sm }}>
      {areas.map((area) => {
        const areaHas = area.stages.some((s) =>
          s.steps.some((x) => x.step.conceptId === currentId),
        );
        const areaKey = `area:${area.key}`;
        const open = isOpen(areaKey, areaHas);
        return (
          <Card key={area.key}>
            <Pressable onPress={() => toggle(areaKey, areaHas)} accessibilityRole="button">
              <Label>
                {open ? '▾' : '▸'} {area.title} · пройдено {area.done} из {area.total}
              </Label>
            </Pressable>
            {open &&
              area.stages.map((stage) => {
                const stageHas = stage.steps.some((x) => x.step.conceptId === currentId);
                const stageKey = `stage:${area.key}:${stage.key}`;
                const stageOpen = isOpen(stageKey, stageHas);
                const done = stage.steps.filter((x) => x.step.done).length;
                return (
                  <View key={stage.key} style={{ gap: space.sm }}>
                    <Pressable
                      onPress={() => toggle(stageKey, stageHas)}
                      accessibilityRole="button"
                    >
                      <Muted>
                        {stageOpen ? '▾' : '▸'} {stage.title} · {done} из {stage.steps.length}
                      </Muted>
                    </Pressable>
                    {stageOpen && stage.steps.map((x) => renderStep(x.step, x.index))}
                  </View>
                );
              })}
          </Card>
        );
      })}
    </View>
  );
}
