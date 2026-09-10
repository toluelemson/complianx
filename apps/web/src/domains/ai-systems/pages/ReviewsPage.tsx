import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { listProjects } from '../api';
import type { ProjectListItem } from '@complianx/contracts/ai-systems';

export default function ReviewsPage() {
  const { token, initializing, activeCompanyId } = useAuth();
  const query = useQuery<ProjectListItem[]>({
    queryKey: ['projects', activeCompanyId],
    enabled: Boolean(token && activeCompanyId),
    queryFn: listProjects,
  });
  const reviews = (query.data ?? []).filter(
    (project) => project.viewerRole !== 'OWNER',
  );

  if (!initializing && !token) return <Navigate to="/login" replace />;

  return (
    <AppShell title="Reviews">
      <div className="hz-console-content space-y-6">
        <div>
          <p className="text-sm text-slate-500">
            Review assigned documentation packages and return a clear decision to the system owner.
          </p>
        </div>
        <div className="space-y-3">
          {reviews.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{project.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {project.industry ?? 'Unspecified domain'} · Your role: {project.viewerRole.toLowerCase()}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {(project.workflowStatus ?? 'DRAFT').replaceAll('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
          {!query.isLoading && !reviews.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No reviews are assigned to you yet.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
