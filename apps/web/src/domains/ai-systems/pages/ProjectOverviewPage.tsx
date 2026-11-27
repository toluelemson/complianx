import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { HelpTooltip } from '@/shared/components/ui/help-tooltip';
import { getProjectWorkflowSummary } from '../api';
import {
  PROJECT_WORKFLOW_STAGES,
  projectWorkflowStagePath,
} from '../lib/workflow-stages';

export default function ProjectOverviewPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const [showGuide, setShowGuide] = useState(
    () =>
      typeof window === 'undefined' ||
      window.localStorage.getItem('neuraldocx-guided-intro') !== 'dismissed',
  );
  const enabled = Boolean(token && projectId && activeCompanyId);
  const summaryQuery = useQuery({
    queryKey: ['project-workflow-summary', projectId, activeCompanyId],
    enabled,
    queryFn: () => getProjectWorkflowSummary(projectId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (!initializing && !token) return <Navigate to="/login" replace />;

  if (summaryQuery.isError || !activeCompanyId) {
    const unavailable =
      !activeCompanyId ||
      (isAxiosError(summaryQuery.error) &&
        [403, 404].includes(summaryQuery.error.response?.status ?? 0));
    const title = unavailable
      ? 'AI system unavailable'
      : 'Could not load the workflow';
    return (
      <AppShell title={title}>
        <div className="hz-console-content">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-amber-900">
              {unavailable
                ? 'Check that you are in the correct company workspace.'
                : 'Retry to load the current workflow status.'}
            </p>
            {!unavailable && (
              <button
                type="button"
                onClick={() => void summaryQuery.refetch()}
                className="hz-button hz-button--outline mt-5 mr-3"
              >
                Retry
              </button>
            )}
            <Link
              to="/dashboard"
              className="mt-5 inline-flex rounded-lg bg-amber-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Return to dashboard
            </Link>
          </section>
        </div>
      </AppShell>
    );
  }

  const summary = summaryQuery.data;
  const loading = summaryQuery.isPending;
  const nextAction = summary?.nextAction;
  const completedStages = summary?.completedStages ?? [];

  return (
    <AppShell title={summary?.name ?? 'Project overview'} projectId={projectId}>
      <div className="hz-console-content space-y-5">
        {showGuide ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
                  New to Neuraldocx?
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Follow one task at a time.
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-sky-900">
                  Describe the system, check what applies, complete the work,
                  add proof, and then ask a person to review it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem(
                    'neuraldocx-guided-intro',
                    'dismissed',
                  );
                  setShowGuide(false);
                }}
                className="text-sm font-semibold text-sky-800 hover:underline"
              >
                Got it
              </button>
            </div>
            <Link
              to="/demo/loan-approval-ai"
              className="mt-3 inline-flex text-sm font-semibold text-sky-800 hover:underline"
            >
              Try a safe fictional example →
            </Link>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Your next task
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                {loading
                  ? 'Finding your next task…'
                  : (nextAction?.title ?? 'No next task')}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {loading
                  ? 'Checking your saved work and review status.'
                  : (nextAction?.detail ??
                    'Review the project’s recorded status below.')}
              </p>
              {nextAction ? (
                <Link
                  to={nextAction.href}
                  className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {nextAction.actionLabel} →
                </Link>
              ) : null}
            </div>
            <div className="min-w-48 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950">
              <p className="text-3xl font-semibold">
                {loading ? '—' : completedStages.length} of{' '}
                {PROJECT_WORKFLOW_STAGES.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                guided steps complete
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${(completedStages.length / PROJECT_WORKFLOW_STAGES.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Your 5-stage plan</h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {PROJECT_WORKFLOW_STAGES.map((stage) => {
              const current = nextAction?.stage === stage.id;
              const complete = completedStages.includes(stage.id);
              return (
                <li
                  key={stage.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                    current
                      ? 'border-sky-300 bg-sky-50'
                      : complete
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {current
                        ? 'Current task'
                        : complete
                          ? 'Complete'
                          : `Stage ${stage.number}`}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {stage.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <HelpTooltip label={`About ${stage.label}`}>
                      {stage.description}
                    </HelpTooltip>
                    <Link
                      to={projectWorkflowStagePath(projectId, stage)}
                      aria-label={`Open ${stage.label}`}
                      className="text-sm font-semibold text-sky-700 hover:underline"
                    >
                      Open →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {summary && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-semibold text-slate-900">
                Project status ·{' '}
                {summary.workflowStatus.replaceAll('_', ' ').toLowerCase()}
              </h2>
              {summary.classificationCategory && (
                <p className="mt-2 text-sm text-slate-700">
                  Recorded classification:{' '}
                  {summary.classificationCategory.replaceAll('_', ' ')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Metric value={summary.blockers} label="blockers" />
                <Metric value={summary.waiting} label="awaiting review" />
                <Metric
                  value={summary.verifiedRequirements}
                  label={`of ${summary.applicableRequirements} applicable requirements approved with verified evidence`}
                />
              </div>
            </div>
            <Link
              to={`/projects/${projectId}/requirements`}
              className="text-sm font-semibold text-sky-700 hover:underline"
            >
              View project issues →
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
      <strong className="text-slate-950">{value}</strong> {label}
    </span>
  );
}
