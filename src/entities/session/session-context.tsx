// Сессия пользователя (WS1): состояние аутентификации + действия.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readSubject, type Subject } from './subject';
import {
  fetchMe,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type AuthUser,
} from '@/shared/api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionValue {
  status: Status;
  user: AuthUser | null;
  /** Права администратора: канон графа правит только он (backend вернёт 403). */
  isAdmin: boolean;
  /** Предмет изучения из профиля. null — онбординг ещё не пройден. */
  subject: Subject | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refresh(): Promise<void> {
    const token = await getToken();
    if (!token) {
      setStatus('anonymous');
      setUser(null);
      return;
    }
    try {
      setUser(await fetchMe());
      setStatus('authenticated');
    } catch {
      setStatus('anonymous');
      setUser(null);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      isAdmin: user?.is_superuser === true,
      subject: readSubject(user?.profile),
      async login(email, password) {
        await apiLogin(email, password);
        await refresh();
      },
      async register(email, password) {
        await apiRegister(email, password);
        await refresh();
      },
      async logout() {
        await apiLogout();
        setStatus('anonymous');
        setUser(null);
      },
      refresh,
    }),
    [status, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession: отсутствует <SessionProvider>');
  return v;
}
