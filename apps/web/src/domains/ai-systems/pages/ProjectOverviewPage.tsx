import { Link, Navigate, useParams } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type {
  ProjectDetail,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import {
  getPreliminaryClassification,
  getProject,
  getProjectDocuments,
  getProjectSections,
  listObligationEvidence,
  listProjectObligations,
} from '../api';
import {
  buildProjectAttention,
  type AttentionCategory,
} from '../lib/project-attention';

const categoryStyle: Record<AttentionCategory, string> = {
  BLOCKED: 'border-rose-200 bg-rose-50 text-rose-700',
  ACTION_REQUIRED: 'border-amber-200 bg-amber-50 text-amber-700',
  WAITING: 'border-sky-200 bg-sky-50 text-sky-700',
};

const categoryLabel: Record<AttentionCategory, string> = {
  BLOCKED: 'Blocked',
  ACTION_REQUIRED: 'Action required',
  WAITING: 'Awaiting review',
};

export default function ProjectOverviewPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const enabled = Boolean(token && projectId && activeCompanyId);
  const projectQuery = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled,
    queryFn: () => getProject(projectId),
  });
  const sectionsQuery = useQuery<SectionWithMeta[]>({
    queryKey: ['sections', projectId, activeCompanyId],
    enabled,
    queryFn: () => getProjectSections(projectId),
  });
  const documentsQuery = useQuery({
    queryKey: ['documents', projectId, activeCompanyId],
    enabled,
    queryFn: () => getProjectDocuments(projectId),
  });
  const classificationQuery = useQuery({
    queryKey: ['preliminary-classification', projectId, activeCompanyId],
    enabled,
    queryFn: () => getPreliminaryClassification(projectId),
  });
  const obligationsQuery = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled,
    queryFn: () => listProjectObligations(projectId),
  });
  const requirements = obligationsQuery.data ?? [];
  const evidenceQueries = useQueries({
    queries: requirements.map((requirement) => ({
      queryKey: [
        'obligationEvidence',
        projectId,
        requirement.id,
        activeCompanyId,
      ],
      enabled,
      queryFn: () => listObligationEvidence(projectId, requirement.id),
    })),
  });

  if (!initializing && !token) return <Navigate to="/login" replace />;

  const sections = sectionsQuery.data ?? [];
  const evidenceByRequirement = Object.fromEntries(
    requirements.map((requirement, index) => [
      requirement.id,
      evidenceQueries[index]?.data ?? [],
    ]),
  );
  const attention = buildProjectAttention({
    projectId,
    workflowStatus: projectQuery.data?.workflowStatus,
    viewerRole: projectQuery.data?.viewerRole,
    classification: classificationQuery.data,
    requirements,
    evidenceByRequirement,
    documents: documentsQuery.data ?? [],
    incompleteSectionCount: sections.filter(
      (section) => !Object.keys(section.content ?? {}).length,
    ).length,
  });
  const loading =
    projectQuery.isLoading ||
    sectionsQuery.isLoading ||
    documentsQuery.isLoading ||
    classificationQuery.isLoading ||
    obligationsQuery.isLoading ||
    evidenceQueries.some((query) => query.isLoading);
  const actionCount = attention.items.filter(
    (item) => item.category === 'ACTION_REQUIRED',
  ).length;

  return (
    <AppShell
      title={projectQuery.data?.name ?? 'Project overview'}
      projectId={projectId}
    >
      <div className="hz-console-content space-y-5">
        <section className="overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                EU AI Act readiness
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                {loading
                  ? 'Checking what needs attention…'
                  : (attention.primary?.title ??
                    'Ready for the next review stage')}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {loading
                  ? 'Reviewing classification, requirements, evidence, and approvals.'
                  : (attention.primary?.detail ??
                    'No unresolved compliance preparation items were found.')}
              </p>
              {!loading && attention.primary ? (
                <Link
                  to={attention.primary.href}
                  className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-50"
                >
                  {attention.primary.actionLabel} →
                </Link>
              ) : null}
            </div>
            <div className="min-w-40 rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-4xl font-semibold">{attention.score}%</p>
              <p className="mt-1 text-xs text-slate-300">
                requirements approved
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Metric value={attention.blockers} label="blockers" />
            <Metric value={attention.waiting} label="awaiting review" />
            <Metric value={actionCount} label="actions required" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                What is missing?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Prioritized from blocking issues through items waiting on a
                person.
              </p>
            </div>
            <Link
              to={`/projects/${projectId}/requirements`}
              className="text-sm font-semibold text-sky-700"
            >
              All requirements →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {attention.items.map((item) => (
              <article
                key={`${item.category}-${item.entityType}-${item.entityId}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
              >
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${categoryStyle[item.category]}`}
                  >
                    {categoryLabel[item.category]}
                  </span>
                  <h3 className="mt-2 font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
                <Link
                  to={item.href}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
                >
                  {item.actionLabel} →
                </Link>
              </article>
            ))}
            {!loading && !attention.items.length ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                No missing or waiting items were found. The project can move to
                its next workflow stage.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
      <strong>{value}</strong> {label}
    </span>
  );
}
