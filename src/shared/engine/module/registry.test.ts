import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from './registry';
import type { ModuleManifest } from './manifest';

function fakeModule(id: string, types: string[]): ModuleManifest {
  return {
    id,
    title: `Fake ${id}`,
    activityTypes: types.map((type) => ({
      type,
      connectivity: 'offline',
      payloadSchema: {},
    })),
    renderers: Object.fromEntries(types.map((type) => [type, () => `render:${type}`])),
  };
}

describe('ModuleRegistry', () => {
  it('регистрирует модуль и возвращает его типы Activity', () => {
    const reg = createModuleRegistry();
    reg.registerModule(fakeModule('alpha', ['card_flip', 'drill']));

    expect(reg.getModules().map((m) => m.id)).toEqual(['alpha']);
    expect(
      reg
        .getActivityTypes()
        .map((t) => t.type)
        .sort(),
    ).toEqual(['card_flip', 'drill']);
  });

  it('диспетчеризует по type без знания предметной области', () => {
    const reg = createModuleRegistry();
    reg.registerModule(fakeModule('alpha', ['card_flip']));
    reg.registerModule(fakeModule('beta', ['essay']));

    expect(reg.getModuleIdForType('card_flip')).toBe('alpha');
    expect(reg.getModuleIdForType('essay')).toBe('beta');
    expect(reg.getModuleIdForType('unknown')).toBeUndefined();

    const renderer = reg.getRenderer('essay');
    expect(renderer?.({ activity: {} as never, onComplete: () => {} })).toBe('render:essay');
  });

  it('запрещает повторную регистрацию модуля', () => {
    const reg = createModuleRegistry();
    reg.registerModule(fakeModule('alpha', ['card_flip']));
    expect(() => reg.registerModule(fakeModule('alpha', ['other']))).toThrow(/already registered/);
  });

  it('запрещает коллизию типов между модулями', () => {
    const reg = createModuleRegistry();
    reg.registerModule(fakeModule('alpha', ['shared_type']));
    expect(() => reg.registerModule(fakeModule('beta', ['shared_type']))).toThrow(/collision/);
  });
});
