import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '../../platform/query/query-client';
import { AuthProvider } from './AuthContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-right" />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
