// Главный блок «Сегодня» (макет: Сегодня · состояния): метка, заголовок, причина и одно-два действия.
// Один вид на все состояния предмета — приоритет решает next-action.ts, а не вёрстка.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Card, Display, Label, Muted, Pill, Title, space } from '@/shared/ui';

type PillTone = 'accent' | 'info' | 'warn' | 'danger' | 'muted';

export function StateHero({
  label,
  badge,
  title,
  reason,
  primary,
  secondary,
  tone = 'accent',
  big = false,
  children,
}: {
  label: string;
  badge?: { text: string; tone: PillTone };
  title: string;
  reason?: string;
  primary?: { label: string; onPress: () => void; busy?: boolean };
  secondary?: { label: string; onPress: () => void };
  /** `plain` — спокойный блок без акцента (пауза, загрузка). */
  tone?: 'accent' | 'plain';
  /** Крупный заголовок: число или короткая фраза (повторение, «Что хотите изучить?»). */
  big?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card tone={tone}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Label>{label}</Label>
        {badge && <Pill text={badge.text} tone={badge.tone} />}
      </View>
      {big ? <Display>{title}</Display> : <Title>{title}</Title>}
      {reason ? <Muted>{reason}</Muted> : null}
      {children}
      {primary && <Button label={primary.label} onPress={primary.onPress} busy={primary.busy} />}
      {secondary && <Button label={secondary.label} variant="quiet" onPress={secondary.onPress} />}
    </Card>
  );
}
