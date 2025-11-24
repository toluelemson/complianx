import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type User } from '../context/AuthContext';
import { setupApiMocks } from './setupApiMocks';

const defaultUser: User = {
  id: 'storybook-user',
  email: 'designer@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  role: 'ADMIN',
  companyId: 'company-1',
};

const queryClient = new QueryClient();

interface StoryProvidersProps {
  children: ReactNode;
  user?: User;
}

export function StoryProviders({ children, user = defaultUser }: StoryProvidersProps) {
  const login = () => undefined;
  const logout = () => undefined;

  useEffect(() => {
    // ensure there's mock auth data for hooks that read localStorage
    localStorage.setItem(
      'aicd_auth',
      JSON.stringify({
        user,
        token: 'storybook-token',
      }),
    );
    setupApiMocks();
    return () => {
      localStorage.removeItem('aicd_auth');
    };
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          token: 'storybook-token',
          initializing: false,
          login,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
