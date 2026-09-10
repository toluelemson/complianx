import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { listAssignedReviews } from '../api';

export default function ReviewsPage() {
  const { token, initializing, activeCompanyId, user } = useAuth();
  const query = useQuery({
    queryKey: ['reviews', 'assigned', activeCompanyId],
    enabled: Boolean(token && activeCompanyId),
    queryFn: listAssignedReviews,
  });
  const reviews = (query.data ?? []).filter((project) => {
    const status = project.workflowStatus;
    const awaitingReview =
      project.reviewerId === user?.id &&
      ['READY_FOR_REVIEW', 'IN_REVIEW', 'RESUBMITTED'].includes(status);
    const awaitingApproval =
      project.approverId === user?.id && status === 'APPROVED';
    return awaitingReview || awaitingApproval || status === 'CHANGES_REQUESTED';
  });

  if (!initializing && !token) return <Navigate to="/login" replace />;

  return (
    <AppShell title="Reviews">
      <div className="hz-console-content space-y-6">
        <div>
          <p className="text-sm text-slate-500">Packages assigned to you.</p>
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
                  <h2 className="font-semibold text-slate-900">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {project.approverId === user?.id ? 'Approval' : 'Review'} ·
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Requested by {project.ownerEmail ?? 'project owner'}
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
              No actions are waiting for you.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
