import { describe, expect, it } from 'vitest';
import type { PushState } from '@/shared/api';
import { describePush } from './push-model';

const state = (over: Partial<PushState> = {}): PushState => ({
  devices: 0,
  enabled: false,
  available: true,
  ...over,
});

describe('настройка уведомлений', () => {
  it('на устройстве без поддержки включить нельзя', () => {
    const v = describePush(state(), false, null);
    expect(v.action).toBeNull();
    expect(v.label).toBe('Недоступно');
  });

  it('если сервер не рассылает, кнопки нет', () => {
    expect(describePush(state({ available: false }), true, null).action).toBeNull();
  });

  it('включённые предлагают отключить', () => {
    const v = describePush(state({ devices: 1, enabled: true }), true, null);
    expect(v).toMatchObject({ label: 'Включены', action: 'disable', actionLabel: 'Отключить' });
  });

  it('отключённое устройство отличается от ненастроенного', () => {
    expect(describePush(state({ devices: 1 }), true, null).label).toBe('Отключены');
    expect(describePush(state(), true, null).label).toBe('Выключены');
  });

  it('причина неудачи объясняется человеку и кнопка остаётся', () => {
    const v = describePush(state(), true, 'denied');
    expect(v.action).toBe('enable');
    expect(v.hint).toContain('настройках телефона');
    expect(describePush(state(), true, 'no_project').hint).toContain('EAS');
  });
});
