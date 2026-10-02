// Проверка манифеста модуля на клиенте (C-0001, T-0051): те же правила и коды отказа, что на
// сервере (core/manifest.py), чтобы один контракт читался одинаково по обе стороны.

/** Версия контракта клиентского ядра. Мажорная — несовместимые изменения; минорная — дополнения. */
export const CONTRACT_VERSION = '1.0';

export type ManifestErrorCode =
  | 'bad_id'
  | 'bad_title'
  | 'bad_version'
  | 'bad_contract'
  | 'contract_incompatible'
  | 'duplicate_id';

export class ManifestError extends Error {
  constructor(
    public code: ManifestErrorCode,
    public moduleId: string,
    message: string,
  ) {
    super(`Модуль «${moduleId}»: ${message}`);
    this.name = 'ManifestError';
  }
}

export function parseVersion(text: string): number[] | null {
  const t = (text ?? '').trim();
  if (!/^\d+(\.\d+){1,2}$/.test(t)) return null;
  return t.split('.').map(Number);
}

/** Мажорная совпадает, минорная модуля не новее ядра. */
export function contractCompatible(
  moduleContract: string,
  core: string = CONTRACT_VERSION,
): boolean {
  const m = parseVersion(moduleContract);
  const c = parseVersion(core);
  if (!m || !c) return false;
  return m[0] === c[0] && m[1] <= c[1];
}

export interface ManifestHeader {
  id: string;
  title: string;
  version: string;
  contract: string;
}

export function checkManifestHeader(m: ManifestHeader): void {
  if (!/^[a-z][a-z0-9_]{1,31}$/.test(m.id ?? '')) {
    throw new ManifestError(
      'bad_id',
      m.id || '?',
      'идентификатор — строчные латинские буквы, цифры и «_»',
    );
  }
  if (!(m.title ?? '').trim()) throw new ManifestError('bad_title', m.id, 'не указано название');
  if (!parseVersion(m.version)) {
    throw new ManifestError('bad_version', m.id, `версия «${m.version}» не вида 1.2 или 1.2.3`);
  }
  if (!parseVersion(m.contract)) {
    throw new ManifestError('bad_contract', m.id, `версия контракта «${m.contract}» не вида 1.2`);
  }
  if (!contractCompatible(m.contract)) {
    throw new ManifestError(
      'contract_incompatible',
      m.id,
      `написан под контракт ${m.contract}, а клиент поддерживает ${CONTRACT_VERSION}: обновите модуль или приложение`,
    );
  }
}
