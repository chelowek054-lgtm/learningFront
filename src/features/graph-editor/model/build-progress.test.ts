import { describe, expect, it } from 'vitest';
import type { ProfileState } from '@/shared/api';
import { buildView, elapsedLabel, isPending } from './build-progress';

const NOW = Date.parse('2026-10-07T12:10:00Z');
const state = (patch: Partial<ProfileState>): ProfileState => ({
  exists: true,
  status: 'building',
  profile: null,
  updatedAt: '2026-10-07T12:00:00Z',
  stale: false,
  ...patch,
});

describe('ход сборки графа', () => {
  it('без профиля сборка не начата', () => {
    expect(buildView(null, NOW).kind).toBe('idle');
    expect(buildView({ exists: false, status: null, profile: null }, NOW).kind).toBe('idle');
  });

  it('идущая сборка показывает, сколько она длится, и просит ждать', () => {
    const v = buildView(state({}), NOW);
    expect(v).toMatchObject({ kind: 'running', minutes: 10 });
    expect(v.message).toContain('5–10 минут');
    expect(isPending(state({}))).toBe(true);
  });

  it('прерванная сборка (сервер перезапускали) не опрашивается и предлагает запуск заново', () => {
    const s = state({ stale: true });
    expect(buildView(s, NOW).kind).toBe('stale');
    expect(isPending(s)).toBe(false);
  });

  it('сбой показывает причину с сервера; готово — done', () => {
    expect(buildView(state({ status: 'failed', error: 'модель недоступна' }), NOW).message).toBe(
      'модель недоступна',
    );
    expect(buildView(state({ status: 'failed', error: null }), NOW).message).not.toBe('');
    expect(buildView(state({ status: 'confirmed' }), NOW).kind).toBe('done');
    expect(isPending(state({ status: 'confirmed' }))).toBe(false);
  });

  it('подпись времени', () => {
    expect(elapsedLabel(0)).toBe('только началась');
    expect(elapsedLabel(4)).toBe('идёт уже 4 мин');
  });
});
