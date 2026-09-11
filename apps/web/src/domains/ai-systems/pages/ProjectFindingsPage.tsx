import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import {
  createProjectFinding,
  listProjectFindings,
  updateProjectFinding,
} from '../api';

export default function ProjectFindingsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
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
  const update = useMutation({
    mutationFn: (findingId: string) =>
      updateProjectFinding(projectId, findingId, { status: 'RESOLVED' }),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ['findings', projectId, activeCompanyId],
      });
      toast.success('Finding resolved');
    },
    onError: () => toast.error('Unable to update finding'),
  });
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
            Track gaps, ownership, and remediation without hiding unresolved
            work.
          </p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Add a finding
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="finding-description">
              Finding description
            </label>
            <input
              id="finding-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the gap or review issue"
              className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
            />
            <button
              type="button"
              disabled={!description.trim() || create.isPending}
              onClick={() => create.mutate()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {create.isPending ? 'Adding…' : 'Add finding'}
            </button>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Open findings
          </h2>
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
                {!['RESOLVED', 'ACCEPTED_RISK'].includes(finding.status) ? (
                  <button
                    type="button"
                    onClick={() => update.mutate(finding.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Mark resolved
                  </button>
                ) : null}
              </div>
            ))}
            {!findings.data?.length ? (
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
