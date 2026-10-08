// Легенда схемы (T-0114): над холстом, вне его; сворачивается, выбор запоминается.
import { Pressable, View } from 'react-native';
import { Card, Label, Muted, space } from '@/shared/ui';

const ITEMS: { sample: string; text: string }[] = [
  { sample: '▢ приглушён', text: 'освоено: остаётся на месте, но не мешает' },
  { sample: '▣ яркая рамка', text: 'граница: можно изучать сейчас' },
  { sample: '🔒', text: 'закрыто: сначала нужны предпосылки' },
  { sample: '▢ пунктир', text: 'необязательное понятие' },
  { sample: '⬭ овал', text: 'своё понятие; прямоугольник — общая основа' },
  { sample: '● размер точки', text: 'чем больше понятий на нём стоит, тем крупнее' },
  { sample: '— линия', text: 'нужно раньше; пунктирная и светлая — другая связь' },
];

export function SchemeLegend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Card>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Label>{open ? '▾ Как читать схему' : '▸ Как читать схему'}</Label>
      </Pressable>
      {open && (
        <View style={{ gap: space.xs }}>
          {ITEMS.map((i) => (
            <Muted key={i.sample}>
              {i.sample} — {i.text}
            </Muted>
          ))}
        </View>
      )}
    </Card>
  );
}
