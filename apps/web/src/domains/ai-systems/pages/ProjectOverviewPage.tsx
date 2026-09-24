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
  type AttentionItem,
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
  const projectAvailable = enabled && projectQuery.isSuccess;
  const sectionsQuery = useQuery<SectionWithMeta[]>({
    queryKey: ['sections', projectId, activeCompanyId],
    enabled: projectAvailable,
    queryFn: () => getProjectSections(projectId),
  });
  const documentsQuery = useQuery({
    queryKey: ['documents', projectId, activeCompanyId],
    enabled: projectAvailable,
    queryFn: () => getProjectDocuments(projectId),
  });
  const classificationQuery = useQuery({
    queryKey: ['preliminary-classification', projectId, activeCompanyId],
    enabled: projectAvailable,
    queryFn: () => getPreliminaryClassification(projectId),
  });
  const obligationsQuery = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: projectAvailable,
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
      enabled: projectAvailable,
      queryFn: () => listObligationEvidence(projectId, requirement.id),
    })),
  });

  if (!initializing && !token) return <Navigate to="/login" replace />;

  if (projectQuery.isError) {
    return (
      <AppShell title="AI system unavailable">
        <div className="hz-console-content">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h1 className="text-xl font-semibold">AI system unavailable</h1>
            <p className="mt-2 text-sm text-amber-900">
              This AI system may have been removed, or it is not available in
              the selected workspace.
            </p>
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
  const priorityItems = attention.items.filter(
    (item) => item.category !== 'WAITING',
  );
  const waitingItems = attention.items.filter(
    (item) => item.category === 'WAITING',
  );
  const missingEvidence = requirements
    .filter(
      (requirement) =>
        (evidenceByRequirement[requirement.id] as unknown[] | undefined)
          ?.length === 0,
    )
    .slice(0, 5);
  const unassignedRequirements = requirements
    .filter((requirement) => !requirement.owner)
    .slice(0, 5);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoon = new Date(today);
  dueSoon.setDate(dueSoon.getDate() + 14);
  const datedRequirements = requirements
    .filter((requirement) => requirement.dueAt)
    .map((requirement) => ({
      requirement,
      dueAt: new Date(requirement.dueAt!),
    }))
    .filter(({ dueAt }) => dueAt <= dueSoon)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 5);
  const milestones = [
    {
      label: 'Classified',
      complete: Boolean(classificationQuery.data),
      detail: 'Preliminary EU AI Act mapping recorded',
    },
    {
      label: 'Requirements assigned',
      complete:
        requirements.length > 0 && requirements.every((item) => item.owner),
      detail: 'Each applicable requirement has an owner',
    },
    {
      label: 'Evidence linked',
      complete:
        requirements.length > 0 &&
        requirements.every(
          (item) =>
            (evidenceByRequirement[item.id] as unknown[] | undefined)
              ?.length,
        ),
      detail: 'Each applicable requirement has supporting proof',
    },
    {
      label: 'Ready for review',
      complete: ['IN_REVIEW', 'APPROVED'].includes(
        projectQuery.data?.workflowStatus ?? '',
      ),
      detail: 'Submitted for human verification',
    },
    {
      label: 'Audit package ready',
      complete: (documentsQuery.data?.length ?? 0) > 0,
      detail: 'A compliance package has been generated',
    },
  ];

  return (
    <AppShell
      title={projectQuery.data?.name ?? 'Project overview'}
      projectId={projectId}
    >
      <div className="hz-console-content space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                EU AI Act readiness
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                {loading
                  ? 'Checking what needs attention…'
                  : (attention.primary?.title ??
                    'Ready for the next review stage')}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {loading
                  ? 'Reviewing classification, requirements, evidence, and approvals.'
                  : (attention.primary?.detail ??
                    'No unresolved compliance preparation items were found.')}
              </p>
              {!loading && attention.primary ? (
                <Link
                  to={attention.primary.href}
                  className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {attention.primary.actionLabel} →
                </Link>
              ) : null}
            </div>
            <div className="min-w-40 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950">
              <p className="text-4xl font-semibold">{attention.score}%</p>
              <p className="mt-1 text-xs text-slate-500">
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
          <h2 className="text-lg font-semibold text-slate-900">
            Compliance milestones
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Follow these stages instead of relying on a percentage alone.
          </p>
          <ol className="mt-5 grid gap-3 md:grid-cols-5">
            {milestones.map((milestone, index) => (
              <li
                key={milestone.label}
                className={`rounded-xl border p-3 ${
                  milestone.complete
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold text-slate-500">
                  {milestone.complete ? 'COMPLETE' : `STEP ${index + 1}`}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {milestone.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {milestone.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {!loading && missingEvidence.length ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-sky-950">
                  Evidence checklist
                </h2>
                <p className="mt-1 text-sm text-sky-900">
                  These requirements need proof before they can move to review.
                </p>
              </div>
              <Link
                to={`/projects/${projectId}/evidence`}
                className="rounded-lg bg-sky-800 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-900"
              >
                Upload evidence
              </Link>
            </div>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {missingEvidence.map((requirement) => (
                <li
                  key={requirement.id}
                  className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <Link
                    to={`/projects/${projectId}/requirements#requirement-${requirement.id}`}
                    className="font-medium text-sky-800 hover:underline"
                  >
                    {requirement.obligation.title}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    No evidence linked
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && unassignedRequirements.length ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-amber-950">
                  Ownership checklist
                </h2>
                <p className="mt-1 text-sm text-amber-900">
                  Assign an accountable person before work is handed into review.
                </p>
              </div>
              <Link
                to={`/projects/${projectId}/requirements`}
                className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-900"
              >
                Assign owners
              </Link>
            </div>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {unassignedRequirements.map((requirement) => (
                <li
                  key={requirement.id}
                  className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <Link
                    to={`/projects/${projectId}/requirements#requirement-${requirement.id}`}
                    className="font-medium text-amber-900 hover:underline"
                  >
                    {requirement.obligation.title}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    Owner not assigned
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && datedRequirements.length ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-rose-950">
                  Due soon
                </h2>
                <p className="mt-1 text-sm text-rose-900">
                  Overdue and next-14-day requirement deadlines.
                </p>
              </div>
              <Link
                to={`/projects/${projectId}/requirements`}
                className="rounded-lg bg-rose-800 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-900"
              >
                Manage deadlines
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {datedRequirements.map(({ requirement, dueAt }) => {
                const overdue = dueAt < today;
                return (
                  <li
                    key={requirement.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm"
                  >
                    <Link
                      to={`/projects/${projectId}/requirements#requirement-${requirement.id}`}
                      className="font-medium text-rose-950 hover:underline"
                    >
                      {requirement.obligation.title}
                    </Link>
                    <span className={overdue ? 'font-semibold text-rose-700' : 'text-rose-800'}>
                      {overdue ? 'Overdue' : 'Due'} {dueAt.toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Next to resolve
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
            {priorityItems.map((item) => (
              <AttentionItemCard key={itemKey(item)} item={item} />
            ))}
            {waitingItems.length ? (
              <details className="rounded-xl border border-slate-200 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  Show {waitingItems.length} item
                  {waitingItems.length === 1 ? '' : 's'} awaiting review
                </summary>
                <div className="mt-3 space-y-3">
                  {waitingItems.map((item) => (
                    <AttentionItemCard key={itemKey(item)} item={item} />
                  ))}
                </div>
              </details>
            ) : null}
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

function itemKey(item: AttentionItem) {
  return `${item.category}-${item.entityType}-${item.entityId}`;
}

function AttentionItemCard({ item }: { item: AttentionItem }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div className="min-w-0 flex-1">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${categoryStyle[item.category]}`}
        >
          {categoryLabel[item.category]}
        </span>
        <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
      </div>
      <Link
        to={item.href}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
      >
        {item.actionLabel} →
      </Link>
    </article>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
      <strong className="text-slate-950">{value}</strong> {label}
    </span>
  );
}
