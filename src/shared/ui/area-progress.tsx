// Ход сборки по областям: у каждой свой статус «ждёт / в работе / готово / не вышло» (R-0056, S-07).
import { View } from 'react-native';
import { Body, Pill } from './kit';
import { space } from './theme';

export type AreaStatus = 'waiting' | 'working' | 'done' | 'failed';

export interface AreaProgressItem {
  key: string;
  title: string;
  status: AreaStatus;
}

const LABEL: Record<AreaStatus, string> = {
  waiting: 'ждёт',
  working: 'в работе',
  done: 'готово',
  failed: 'не вышло',
};

export function AreaProgress({ items }: { items: AreaProgressItem[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item) => (
        <View key={item.key} style={{ gap: space.xs }}>
          <Body>{item.title}</Body>
          <Pill text={LABEL[item.status]} tone={item.status === 'done' ? 'core' : 'muted'} />
        </View>
      ))}
    </View>
  );
}
