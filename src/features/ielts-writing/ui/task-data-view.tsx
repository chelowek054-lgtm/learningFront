// Данные задания Task 1: столбчатая диаграмма и та же таблица цифрами.
// Цифры нужны всегда: по ним пишут описание и по ним же проверяют точность.
import { View } from 'react-native';
import { Card, Label, Muted, radius, space, useTheme } from '@/shared/ui';
import { barRows, type TaskData } from '../lib/task-data';

export function TaskDataView({ data }: { data: TaskData }) {
  const { colors } = useTheme();
  const rows = barRows(data);
  // Ряды различаем по яркости одного акцента: отдельной палитры у темы для данных нет.
  const opacity = (i: number) => 1 - (i * 0.6) / Math.max(1, data.series.length);
  return (
    <Card>
      {!!data.title && <Label>{data.title}</Label>}
      {rows.map((row) => (
        <View key={row.category} style={{ gap: space.xs }}>
          <Muted>{row.category}</Muted>
          {row.bars.map((bar, i) => (
            <View
              key={bar.series}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
            >
              <View
                style={{
                  height: 10,
                  width: `${Math.round(bar.fraction * 70)}%`,
                  minWidth: bar.value > 0 ? 3 : 0,
                  borderRadius: radius.sm,
                  backgroundColor: colors.accent,
                  opacity: opacity(i),
                }}
              />
              <Muted>
                {bar.series}: {bar.value}
                {data.unit ?? ''}
              </Muted>
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}
