// Плашки «Сегодня» (T-0120, R-0063): самостоятельные мини-виджеты под главным действием дня.
// Видимость плашки запоминается на устройстве; скрытые возвращаются через «Настроить».
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { rememberFlag, remembered } from '@/shared/lib';
import { Card, Label, Muted, space } from '@/shared/ui';

export interface Tile {
  id: string;
  title: string;
  text: string;
  onPress?: () => void;
}

export function TodayTiles({ tiles }: { tiles: Tile[] }) {
  const [editing, setEditing] = useState(false);
  const [, force] = useState(0);
  const shown = (id: string) => remembered(`tile:${id}`, true);
  const visible = tiles.filter((t) => editing || shown(t.id));

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {visible.map((t) => (
          <View key={t.id} style={{ flexGrow: 1, flexBasis: 220, opacity: shown(t.id) ? 1 : 0.5 }}>
            <Card onPress={editing ? undefined : t.onPress}>
              <Label>{t.title}</Label>
              <Muted>{t.text}</Muted>
              {editing && (
                <Pressable
                  onPress={() => {
                    rememberFlag(`tile:${t.id}`, !shown(t.id));
                    force((n) => n + 1);
                  }}
                >
                  <Muted>{shown(t.id) ? 'Скрыть плашку' : 'Показать плашку'}</Muted>
                </Pressable>
              )}
            </Card>
          </View>
        ))}
      </View>
      <Pressable onPress={() => setEditing(!editing)}>
        <Muted>{editing ? 'Готово' : 'Настроить плашки'}</Muted>
      </Pressable>
    </View>
  );
}
