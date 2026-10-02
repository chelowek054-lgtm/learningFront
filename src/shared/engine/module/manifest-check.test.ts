import { describe, expect, it } from 'vitest';
import {
  CONTRACT_VERSION,
  ManifestError,
  checkManifestHeader,
  contractCompatible,
  parseVersion,
} from './manifest-check';
import { createModuleRegistry } from './registry';
import type { ModuleManifest } from './manifest';

const header = (over: Partial<Parameters<typeof checkManifestHeader>[0]> = {}) => ({
  id: 'alpha',
  title: 'Модуль',
  version: '1.0',
  contract: CONTRACT_VERSION,
  ...over,
});

const codeOf = (fn: () => void): string => {
  try {
    fn();
  } catch (e) {
    return (e as ManifestError).code;
  }
  return 'ok';
};

describe('версии', () => {
  it('разбор версий', () => {
    expect(parseVersion('1.2')).toEqual([1, 2]);
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    for (const bad of ['', '1', 'x.y', '1.2.3.4', 'v1.0']) expect(parseVersion(bad)).toBeNull();
  });

  it('мажорная совпадает, минорная модуля не новее ядра', () => {
    expect(contractCompatible('1.0', '1.3')).toBe(true);
    expect(contractCompatible('1.4', '1.3')).toBe(false);
    expect(contractCompatible('2.0', '1.3')).toBe(false);
    expect(contractCompatible('garbage')).toBe(false);
  });
});

describe('checkManifestHeader', () => {
  it('исправный манифест проходит', () => {
    expect(codeOf(() => checkManifestHeader(header()))).toBe('ok');
  });

  it('те же причины отказа, что на сервере', () => {
    expect(codeOf(() => checkManifestHeader(header({ id: 'Bad Id' })))).toBe('bad_id');
    expect(codeOf(() => checkManifestHeader(header({ title: '  ' })))).toBe('bad_title');
    expect(codeOf(() => checkManifestHeader(header({ version: '1' })))).toBe('bad_version');
    expect(codeOf(() => checkManifestHeader(header({ contract: 'x' })))).toBe('bad_contract');
    expect(codeOf(() => checkManifestHeader(header({ contract: '2.0' })))).toBe(
      'contract_incompatible',
    );
  });

  it('сообщение называет обе версии', () => {
    try {
      checkManifestHeader(header({ contract: '2.0' }));
    } catch (e) {
      expect((e as Error).message).toContain('2.0');
      expect((e as Error).message).toContain(CONTRACT_VERSION);
    }
  });
});

describe('реестр отклоняет несовместимый модуль', () => {
  const mod = (over: Partial<ModuleManifest>): ModuleManifest => ({
    ...header(),
    activityTypes: [],
    renderers: {},
    ...over,
  });

  it('несовместимый контракт не регистрируется, совместимый — да', () => {
    const reg = createModuleRegistry();
    expect(() => reg.registerModule(mod({ contract: '2.0' }))).toThrow(/контракт/);
    reg.registerModule(mod({}));
    expect(reg.getModules().map((m) => m.id)).toEqual(['alpha']);
  });

  it('занятый идентификатор — с кодом duplicate_id', () => {
    const reg = createModuleRegistry();
    reg.registerModule(mod({}));
    try {
      reg.registerModule(mod({}));
      throw new Error('должно было отклониться');
    } catch (e) {
      expect((e as ManifestError).code).toBe('duplicate_id');
    }
  });
});
