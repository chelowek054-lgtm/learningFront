// Плашки «Сегодня» (T-0120, R-0063): самостоятельные мини-виджеты под главным действием дня.
// Видимость и порядок плашек запоминаются на устройстве (на телефоне — до закрытия приложения).
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { rememberFlag, remembered, rememberedText, rememberText } from '@/shared/lib';
import { Card, Label, Muted, space } from '@/shared/ui';
import { moveId, orderTiles } from '../model/tiles-model';

export interface Tile {
  id: string;
  title: string;
  text: string;
  onPress?: () => void;
}

const ORDER_KEY = 'tiles-order';

/** Зона нажатия не меньше 44 px (D-0001). */
const hit = { minHeight: 44, justifyContent: 'center' } as const;

export function TodayTiles({ tiles }: { tiles: Tile[] }) {
  const [editing, setEditing] = useState(false);
  const [, force] = useState(0);
  const shown = (id: string) => remembered(`tile:${id}`, true);
  const ordered = orderTiles(tiles, rememberedText(ORDER_KEY));
  const visible = ordered.filter((t) => editing || shown(t.id));

  function move(id: string, delta: -1 | 1) {
    rememberText(
      ORDER_KEY,
      moveId(
        ordered.map((t) => t.id),
        id,
        delta,
      ).join(','),
    );
    force((n) => n + 1);
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {visible.map((t) => (
          <View key={t.id} style={{ flexGrow: 1, flexBasis: 220, opacity: shown(t.id) ? 1 : 0.5 }}>
            <Card onPress={editing ? undefined : t.onPress}>
              <Label>{t.title}</Label>
              <Muted>{t.text}</Muted>
              {editing && (
                <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
                  <Pressable style={hit} onPress={() => move(t.id, -1)}>
                    <Muted>↑ выше</Muted>
                  </Pressable>
                  <Pressable style={hit} onPress={() => move(t.id, 1)}>
                    <Muted>↓ ниже</Muted>
                  </Pressable>
                  <Pressable
                    style={hit}
                    onPress={() => {
                      rememberFlag(`tile:${t.id}`, !shown(t.id));
                      force((n) => n + 1);
                    }}
                  >
                    <Muted>{shown(t.id) ? 'Скрыть' : 'Показать'}</Muted>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>
        ))}
      </View>
      <Pressable style={hit} onPress={() => setEditing(!editing)}>
        <Muted>{editing ? 'Готово' : 'Настроить плашки'}</Muted>
      </Pressable>
    </View>
  );
}
