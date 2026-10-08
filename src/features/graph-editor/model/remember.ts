// Запоминание мелких настроек вида (свёрнута ли легенда). Хранилище — localStorage на вебе; там, где его нет
// (телефон), настройка живёт до закрытия приложения. Любой сбой хранилища не должен ломать экран.
const memory = new Map<string, boolean>();

type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const store = (): Store | null => {
  try {
    return (globalThis as { localStorage?: Store }).localStorage ?? null;
  } catch {
    return null;
  }
};

export function remembered(key: string, fallback: boolean): boolean {
  if (memory.has(key)) return memory.get(key) as boolean;
  try {
    const raw = store()?.getItem(`praxis:${key}`);
    if (raw === '1' || raw === '0') return raw === '1';
  } catch {
    /* хранилище недоступно — берём значение по умолчанию */
  }
  return fallback;
}

export function rememberFlag(key: string, value: boolean): void {
  memory.set(key, value);
  try {
    store()?.setItem(`praxis:${key}`, value ? '1' : '0');
  } catch {
    /* не запомнилось — не страшно */
  }
}
