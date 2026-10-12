// Плашки «Сегодня» (T-0120, R-0063): самостоятельные мини-виджеты под главным действием дня.
// Видимость и порядок плашек запоминаются на устройстве (на телефоне — до закрытия приложения).
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { rememberFlag, remembered, rememberedText, rememberText } from '@/shared/lib';
import { Card, Label, Muted, space } from '@/shared/ui';
import { moveId, orderTiles } from '../model/tiles-model';
import { useI18n } from '@/shared/i18n';

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
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [, force] = useState(0);
  const shown = (id: string) => remembered(`tile:${id}`, true);
  const ordered = orderTiles(tiles, rememberedText(ORDER_KEY));
  const visible = ordered.filter((tile) => editing || shown(tile.id));

  function move(id: string, delta: -1 | 1) {
    rememberText(
      ORDER_KEY,
      moveId(
        ordered.map((tile) => tile.id),
        id,
        delta,
      ).join(','),
    );
    force((n) => n + 1);
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {visible.map((tile) => (
          <View
            key={tile.id}
            style={{ flexGrow: 1, flexBasis: 220, opacity: shown(tile.id) ? 1 : 0.5 }}
          >
            <Card onPress={editing ? undefined : tile.onPress}>
              <Label>{tile.title}</Label>
              <Muted>{tile.text}</Muted>
              {editing && (
                <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
                  <Pressable style={hit} onPress={() => move(tile.id, -1)}>
                    <Muted>{t('homeTodayTiles.1')}</Muted>
                  </Pressable>
                  <Pressable style={hit} onPress={() => move(tile.id, 1)}>
                    <Muted>{t('homeTodayTiles.2')}</Muted>
                  </Pressable>
                  <Pressable
                    style={hit}
                    onPress={() => {
                      rememberFlag(`tile:${tile.id}`, !shown(tile.id));
                      force((n) => n + 1);
                    }}
                  >
                    <Muted>{shown(tile.id) ? t('homeTodayTiles.3') : t('homeTodayTiles.4')}</Muted>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>
        ))}
      </View>
      <Pressable style={hit} onPress={() => setEditing(!editing)}>
        <Muted>{editing ? t('homeTodayTiles.5') : t('homeTodayTiles.6')}</Muted>
      </Pressable>
    </View>
  );
}
