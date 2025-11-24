import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAuthToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  role: 'USER' | 'REVIEWER' | 'ADMIN' | 'COMPANY_ADMIN';
  emailVerified?: boolean;
  companyId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  timezone?: string | null;
}

interface AuthContextValue {
  user?: User;
  token?: string;
  initializing: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const stored = localStorage.getItem('aicd_auth');
  if (!stored) {
    return undefined;
  }
  try {
    return JSON.parse(stored) as { user: User; token: string };
  } catch {
    localStorage.removeItem('aicd_auth');
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialAuth = useMemo(() => readStoredAuth(), []);
  const [user, setUser] = useState<User | undefined>(initialAuth?.user);
  const [token, setToken] = useState<string | undefined>(initialAuth?.token);
  const initializing = false;

  useEffect(() => {
    if (initialAuth?.token) {
      setAuthToken(initialAuth.token);
    }
  }, [initialAuth]);

  const login = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    setAuthToken(nextToken);
    localStorage.setItem(
      'aicd_auth',
      JSON.stringify({ user: nextUser, token: nextToken }),
    );
  };

  const logout = () => {
    setUser(undefined);
    setToken(undefined);
    setAuthToken(undefined);
    localStorage.removeItem('aicd_auth');
  };

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      login,
      logout,
    }),
    [user, token, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
