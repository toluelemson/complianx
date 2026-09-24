import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import {
  createProjectFinding,
  listProjectFindings,
  getProject,
  listProjectObligations,
} from '../api';
import { FindingWorkflow } from '../components/FindingWorkflow';

export default function ProjectFindingsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId, user } = useAuth();
  const client = useQueryClient();
  const [description, setDescription] = useState('');
  const findings = useQuery({
    queryKey: ['findings', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectFindings(projectId),
  });
  const create = useMutation({
    mutationFn: () =>
      createProjectFinding(projectId, {
        source: 'MANUAL_REVIEW',
        obligationId: obligationId || undefined,
        severity: 'MEDIUM',
        description: description.trim(),
      }),
    onSuccess: () => {
      setDescription('');
      void client.invalidateQueries({
        queryKey: ['findings', projectId, activeCompanyId],
      });
      toast.success('Finding created');
    },
    onError: () => toast.error('Unable to create finding'),
  });
  const project = useQuery({
    queryKey: ['project', projectId, activeCompanyId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(token && projectId && activeCompanyId),
  });
  const obligations = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    queryFn: () => listProjectObligations(projectId),
    enabled: Boolean(token && projectId && activeCompanyId),
  });
  const [obligationId, setObligationId] = useState('');
  const isAdmin =
    user?.companies?.some(
      (membership) =>
        membership.companyId === activeCompanyId && membership.role === 'ADMIN',
    ) ?? false;
  const canEdit =
    isAdmin ||
    ['OWNER', 'REVIEWER', 'APPROVER'].includes(project.data?.viewerRole ?? '');
  const canReview =
    isAdmin ||
    ['REVIEWER', 'APPROVER'].includes(project.data?.viewerRole ?? '');
  if (!initializing && !token) return <Navigate to="/login" replace />;
  return (
    <AppShell title="Findings & actions" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Findings &amp; actions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track problems, who owns them, and what needs fixing. Open work
            stays visible until it is reviewed.
          </p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Record a problem
          </h2>
          <div className="mt-4 space-y-3">
            <label className="sr-only" htmlFor="finding-description">
              Problem description
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="finding-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the problem and what needs fixing"
                className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
              />
              <button
                type="button"
                disabled={!canEdit || !description.trim() || create.isPending}
                onClick={() => create.mutate()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {create.isPending ? 'Adding…' : 'Add problem'}
              </button>
            </div>
            <details className="text-sm text-slate-600">
              <summary className="cursor-pointer">
                Link a requirement (optional)
              </summary>
              <select
                aria-label="Related obligation"
                value={obligationId}
                onChange={(event) => setObligationId(event.target.value)}
                className="mt-2 w-full max-w-lg rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">No requirement selected</option>
                {(obligations.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.obligation.title}
                  </option>
                ))}
              </select>
            </details>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Problems to fix
          </h2>
          {findings.isLoading ? <p>Loading findings…</p> : null}
          {findings.isError ? (
            <button onClick={() => void findings.refetch()}>
              Unable to load findings. Retry
            </button>
          ) : null}
          <div className="mt-4 divide-y divide-slate-100">
            {(findings.data ?? []).map((finding) => (
              <div
                key={finding.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4"
              >
                <div>
                  <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <span>{finding.severity}</span>
                    <span>·</span>
                    <span>{finding.source.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">
                    {finding.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {finding.status.replaceAll('_', ' ')} ·{' '}
                    {finding.owner?.email ?? 'Unassigned'}
                  </p>
                </div>
                <FindingWorkflow
                  projectId={projectId}
                  finding={finding}
                  canEdit={canEdit}
                  canReview={canReview}
                />
              </div>
            ))}
            {!findings.isLoading &&
            !findings.isError &&
            !findings.data?.length ? (
              <p className="py-4 text-sm text-slate-500">
                No findings recorded.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
