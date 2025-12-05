import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAuthToken, setCompanyId } from '../api/client';

export interface CompanyMembership {
  companyId: string;
  companyName?: string;
  role?: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  role: 'USER' | 'REVIEWER' | 'ADMIN' | 'COMPANY_ADMIN';
  emailVerified?: boolean;
  companyId?: string | null;
  defaultCompanyId?: string | null;
  companies?: CompanyMembership[];
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  timezone?: string | null;
}

interface AuthContextValue {
  user?: User;
  token?: string;
  activeCompanyId?: string;
  setActiveCompany: (companyId: string | undefined) => void;
  initializing: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface StoredAuth {
  user: User;
  token: string;
  activeCompanyId?: string;
}

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const stored = localStorage.getItem('aicd_auth');
  if (!stored) {
    return undefined;
  }
  try {
    return JSON.parse(stored) as StoredAuth;
  } catch {
    localStorage.removeItem('aicd_auth');
    return undefined;
  }
}

function getDefaultCompanyId(user?: User, override?: string | undefined) {
  if (!user) {
    return undefined;
  }
  const memberships = user.companies ?? [];
  const membershipIds = new Set(memberships.map((m) => m.companyId));
  const allowLegacy = membershipIds.size === 0;
  const isValid = (value?: string | null) =>
    Boolean(value) &&
    (membershipIds.has(value as string) || (allowLegacy && Boolean(value)));

  if (isValid(override)) {
    return override as string;
  }
  if (isValid(user.defaultCompanyId)) {
    return user.defaultCompanyId ?? undefined;
  }
  if (isValid(user.companyId)) {
    return user.companyId ?? undefined;
  }
  return memberships[0]?.companyId ?? undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialAuth = useMemo(() => readStoredAuth(), []);
  const [user, setUser] = useState<User | undefined>(initialAuth?.user);
  const [token, setToken] = useState<string | undefined>(initialAuth?.token);
  const [activeCompanyId, setActiveCompanyId] = useState<string | undefined>(
    getDefaultCompanyId(initialAuth?.user, initialAuth?.activeCompanyId),
  );
  const initializing = false;

  useEffect(() => {
    if (initialAuth?.token) {
      setAuthToken(initialAuth.token);
    }
  }, [initialAuth]);

  useEffect(() => {
    setCompanyId(activeCompanyId);
  }, [activeCompanyId]);

  const persistAuth = (
    nextUser?: User,
    nextToken?: string,
    nextCompanyId?: string,
  ) => {
    if (!nextUser || !nextToken) {
      localStorage.removeItem('aicd_auth');
      return;
    }
    localStorage.setItem(
      'aicd_auth',
      JSON.stringify({
        user: nextUser,
        token: nextToken,
        activeCompanyId: nextCompanyId,
      }),
    );
  };

  const changeActiveCompany = (
    companyId: string | undefined,
    nextUser?: User,
    nextToken?: string,
  ) => {
    if (companyId === undefined) {
      setActiveCompanyId(undefined);
      localStorage.removeItem('aicd_auth');
      return;
    }
    const storedUser = nextUser ?? user;
    const validatedCompanyId = getDefaultCompanyId(storedUser, companyId);
    setActiveCompanyId(validatedCompanyId);
    const storedToken = nextToken ?? token;
    if (!validatedCompanyId || !storedUser || !storedToken) {
      localStorage.removeItem('aicd_auth');
      return;
    }
    persistAuth(storedUser, storedToken, validatedCompanyId);
  };

  const setActiveCompany = (companyId: string | undefined) => {
    changeActiveCompany(companyId);
  };

  const login = (nextUser: User, nextToken: string) => {
    const defaultCompanyId = getDefaultCompanyId(nextUser);
    setUser(nextUser);
    setToken(nextToken);
    setAuthToken(nextToken);
    changeActiveCompany(defaultCompanyId, nextUser, nextToken);
  };

  const logout = () => {
    setUser(undefined);
    setToken(undefined);
    setAuthToken(undefined);
    localStorage.removeItem('aicd_auth');
    changeActiveCompany(undefined);
    setCompanyId(undefined);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      activeCompanyId,
      setActiveCompany,
      initializing,
      login,
      logout,
    }),
    [user, token, activeCompanyId, initializing],
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
