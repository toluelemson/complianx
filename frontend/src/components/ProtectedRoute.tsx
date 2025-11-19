import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
