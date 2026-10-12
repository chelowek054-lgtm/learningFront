// Шапка шага онбординга: пять сегментов и метка «Шаг N из 5».
import { View } from 'react-native';
import { Label, radius, space, useTheme } from '@/shared/ui';
import { STEP_COUNT, stepLabel } from '../model/steps';

export function StepHeader({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }} accessibilityLabel={stepLabel(step)}>
      <View style={{ flexDirection: 'row', gap: space.xs + 2 }}>
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: radius.pill,
              backgroundColor: i < step ? colors.accent : colors.surfaceAlt,
            }}
          />
        ))}
      </View>
      <Label>{stepLabel(step)}</Label>
    </View>
  );
}
