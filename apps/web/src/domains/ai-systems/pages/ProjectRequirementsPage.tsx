import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { listProjectObligations, updateProjectObligation } from '../api';

export default function ProjectRequirementsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const client = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const query = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectObligations(projectId),
  });
  const update = useMutation({
    mutationFn: (input: { id: string; priority: string }) =>
      updateProjectObligation(projectId, input.id, {
        priority: input.priority,
      }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['obligations', projectId] }),
  });
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const items = (query.data ?? []).filter(
    (item) => filter === 'ALL' || item.approvalState === filter,
  );
  return (
    <AppShell title="Requirements" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Requirements
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track ownership, priority, evidence, and approval state.
          </p>
        </div>
        <div className="flex justify-end">
          <select
            aria-label="Filter requirement approval state"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All approval states</option>
            <option value="DRAFT">Draft</option>
            <option value="READY_FOR_REVIEW">Ready for review</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGES_REQUESTED">Changes requested</option>
          </select>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {item.obligation.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.status.replaceAll('_', ' ')} ·{' '}
                      {item.approvalState.replaceAll('_', ' ')} ·{' '}
                      {item.owner?.email ?? 'Unassigned'}
                    </p>
                  </div>
                  <select
                    aria-label={`Priority for ${item.obligation.title}`}
                    value={item.priority}
                    onChange={(event) =>
                      update.mutate({
                        id: item.id,
                        priority: event.target.value,
                      })
                    }
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {item.obligation.legalReference ?? 'No legal reference'}
                  {item.dueAt
                    ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}`
                    : ''}
                </p>
              </article>
            ))}
            {!items.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No requirements match this filter.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
