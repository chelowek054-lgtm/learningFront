import { describe, expect, it } from 'vitest';
import { createModuleRegistry } from './registry';
import type { ModuleManifest } from './manifest';

function fakeModule(id: string, types: string[]): ModuleManifest {
  return {
    id,
    title: `Fake ${id}`,
    activityTypes: types.map((type) => ({
      type,
      title: `Название ${type}`,
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

  it('отдаёт название типа для человека, а незнакомый — слугом', () => {
    // Экраны берут название отсюда: пока его не было, «Сегодня» печатал
    // `concept_recall`. Незнакомый тип возвращает сам слуг — это видно
    // на экране и лучше пустой строки.
    const reg = createModuleRegistry();
    reg.registerModule(fakeModule('alpha', ['card_flip']));

    expect(reg.getActivityTitle('card_flip')).toBe('Название card_flip');
    expect(reg.getActivityType('card_flip')?.connectivity).toBe('offline');
    expect(reg.getActivityTitle('unknown')).toBe('unknown');
    expect(reg.getActivityType('unknown')).toBeUndefined();
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
