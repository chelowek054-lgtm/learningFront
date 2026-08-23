// Генерация UUID для клиентских записей (id создаётся офлайн; идемпотентность sync по id).
import * as Crypto from 'expo-crypto';

export function newId(): string {
  return Crypto.randomUUID();
}
