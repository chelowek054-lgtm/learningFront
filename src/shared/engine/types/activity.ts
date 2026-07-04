// Центральная абстракция ядра — Activity. Доменно-независима.
// См. docs/architecture/02-logical.md §1.

export type Connectivity = 'offline' | 'online';

export interface Activity {
  id: string;
  userId: string;
  /** Идентификатор модуля-владельца — ядро его не интерпретирует, только диспетчеризует. */
  module: string;
  /** Тип Activity, объявленный модулем; по нему идёт диспетчеризация. */
  type: string;
  connectivity: Connectivity;
  /** Структуру валидирует модуль, не ядро. */
  payload: Record<string, unknown>;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601; для SRS-активностей. */
  dueAt?: string;
}
