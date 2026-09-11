import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectDetail } from '@complianx/contracts/ai-systems';
import { getProject, listProjectAuditEvents } from '../api';
import type { AuditEvent } from '@complianx/contracts/ai-systems';

export default function ProjectReviewPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const query = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const auditQuery = useQuery<AuditEvent[]>({
    queryKey: ['project-audit-events', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectAuditEvents(projectId),
  });
  if (!initializing && !token) return <Navigate to="/login" replace />;
  return (
    <AppShell title="Review & approval" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Review &amp; approval
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            An immutable record of the project decision path.
          </p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <Info
              label="Status"
              value={(query.data?.workflowStatus ?? 'DRAFT').replaceAll(
                '_',
                ' ',
              )}
            />
            <Info
              label="Reviewer"
              value={query.data?.reviewer?.email ?? 'Not assigned'}
            />
            <Info
              label="Approver"
              value={query.data?.approver?.email ?? 'Not assigned'}
            />
          </div>
          <h2 className="mt-8 text-lg font-semibold text-slate-900">History</h2>
          <div className="mt-4 space-y-3">
            {query.data?.statusEvents?.map((event) => (
              <div key={event.id} className="border-l-2 border-slate-200 pl-4">
                <p className="text-sm font-medium text-slate-800">
                  {event.status.replaceAll('_', ' ')}
                </p>
                <p className="text-xs text-slate-400">
                  {event.actor?.email ?? 'System'} ·{' '}
                  {new Date(event.createdAt).toLocaleString()}
                  {event.note ? ` · ${event.note}` : ''}
                </p>
              </div>
            ))}
            {!query.data?.statusEvents?.length ? (
              <p className="text-sm text-slate-500">
                No review events recorded yet.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Compliance activity
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Append-only changes to assessments, classifications, requirements,
            and actions.
          </p>
          <div className="mt-4 space-y-3">
            {auditQuery.data?.map((event) => (
              <div key={event.id} className="border-l-2 border-slate-200 pl-4">
                <p className="text-sm font-medium text-slate-800">
                  {event.action.replaceAll('_', ' ')} · {event.entityType}
                </p>
                <p className="text-xs text-slate-400">
                  {event.actor?.email ?? 'System'} ·{' '}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {!auditQuery.data?.length ? (
              <p className="text-sm text-slate-500">
                No compliance activity recorded yet.
              </p>
            ) : null}
          </div>
        </section>
        <div className="flex justify-end">
          <Link
            to={`/projects/${projectId}/compliance-workspace`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open guided assessment
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
