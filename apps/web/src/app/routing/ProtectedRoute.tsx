import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, initializing, activeCompanyId, user, setActiveCompany } =
    useAuth();
  const { pathname, search } = useLocation();
  const requestedCompany = new URLSearchParams(search).get('companyId');
  const shouldSwitch = Boolean(
    token &&
      requestedCompany &&
      requestedCompany !== activeCompanyId &&
      /^\/(projects|ai-systems)\//.test(pathname) &&
      user?.companies?.some(
        (company) => company.companyId === requestedCompany,
      ),
  );
  useEffect(() => {
    if (shouldSwitch && requestedCompany) setActiveCompany(requestedCompany);
  }, [requestedCompany, setActiveCompany, shouldSwitch]);
  if (initializing || shouldSwitch) {
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
