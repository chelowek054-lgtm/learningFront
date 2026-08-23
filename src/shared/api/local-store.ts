// Синглтон LocalStore: одно соединение SQLite на приложение (общий для всех фич).
import type { LocalStore } from '@/shared/engine';
import { createSqliteLocalStore } from './db/sqlite-local-store';

let instance: LocalStore | undefined;

export function getLocalStore(): LocalStore {
  if (!instance) instance = createSqliteLocalStore();
  return instance;
}
