import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectListItem } from '@complianx/contracts/ai-systems';
import { listProjects } from '../api';
import { DOCUMENT_LABELS } from '../constants/documents';

export default function DocumentsPage() {
  const { token, initializing, activeCompanyId } = useAuth();
  const query = useQuery<ProjectListItem[]>({
    queryKey: ['projects', activeCompanyId],
    enabled: Boolean(token && activeCompanyId),
    queryFn: listProjects,
  });
  const documents = useMemo(
    () =>
      (query.data ?? [])
        .flatMap((project) =>
          project.documents.map((document) => ({ ...document, project })),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [query.data],
  );

  if (!initializing && !token) return <Navigate to="/login" replace />;

  return (
    <AppShell title="Documents">
      <div className="hz-console-content space-y-6">
        <p className="text-sm text-slate-500">
          Find the latest generated documentation packages across your workspace.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {documents.length ? (
            <div className="divide-y divide-slate-100">
              {documents.map((document) => (
                <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {DOCUMENT_LABELS[document.type] ?? document.type}
                    </p>
                    <Link to={`/projects/${document.project.id}`} className="text-sm text-slate-500 hover:text-sky-600">
                      {document.project.name}
                    </Link>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(document.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              {query.isLoading ? 'Loading documents...' : 'No documentation packages have been generated yet.'}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
