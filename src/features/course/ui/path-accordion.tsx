// Аккордеон «Весь путь»: область → этап → шаги; свёрнутость запоминается на устройстве (R-0065, T-0122).
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CourseStep } from '@/shared/api';
import { rememberFlag, remembered } from '@/shared/lib';
import { Card, Label, Muted, space } from '@/shared/ui';
import { groupSteps } from '../model/group-steps';
import { useI18n } from '@/shared/i18n';

/** Зона нажатия заголовка: не меньше 44 px, чтобы попасть пальцем. */
const hit = { minHeight: 44, justifyContent: 'center' } as const;

export function PathAccordion({
  steps,
  currentId,
  renderStep,
}: {
  steps: CourseStep[];
  currentId: string | null;
  renderStep: (step: CourseStep, index: number) => ReactNode;
}) {
  const { t } = useI18n();
  // Выбор человека в этой сессии держим в состоянии компонента: перерисовка не зависит от того,
  // записалось ли значение в хранилище. Запоминание между запусками — в дополнение к нему.
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const areas = groupSteps(steps);

  // По умолчанию раскрыто то, где текущий шаг.
  const isOpen = (key: string, hasCurrent: boolean) =>
    chosen[key] ?? remembered(`path:${key}`, hasCurrent);
  const toggle = (key: string, hasCurrent: boolean) => {
    const next = !isOpen(key, hasCurrent);
    rememberFlag(`path:${key}`, next);
    setChosen((prev) => ({ ...prev, [key]: next }));
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
            <Pressable
              onPress={() => toggle(areaKey, areaHas)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={hit}
            >
              <Label>
                {open ? '▾' : '▸'}{' '}
                {t('m.areaProgress', { title: area.title, done: area.done, total: area.total })}
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
                      accessibilityState={{ expanded: stageOpen }}
                      style={hit}
                    >
                      <Muted>
                        {stageOpen ? '▾' : '▸'}{' '}
                        {t('m.stageProgress', {
                          title: stage.title,
                          done,
                          total: stage.steps.length,
                        })}
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
