import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { HelpTooltip } from '@/shared/components/ui/help-tooltip';
import { isAxiosError } from 'axios';
import {
  getProject,
  linkObligationEvidence,
  listObligationEvidence,
  listProjectReviewers,
  listProjectObligations,
  updateProjectObligation,
  unlinkObligationEvidence,
} from '../api';
import { RequirementTraceability } from '../components/RequirementTraceability';
import { RequirementMetadata } from '../components/RequirementMetadata';
import { DOCUMENT_LABELS } from '../constants/documents';

const requirementStatusLabel = (status: string) =>
  ({
    NOT_STARTED: 'Not started',
    IN_PROGRESS: 'In progress',
    UNDER_REVIEW: 'Under review',
    COMPLETE: 'Complete',
    NOT_APPLICABLE: 'Not applicable',
  })[status] ?? status.replaceAll('_', ' ').toLowerCase();

const reviewStageLabel = (status: string) =>
  ({
    DRAFT: 'Not sent for review',
    READY_FOR_REVIEW: 'Ready for review',
    APPROVED: 'Approved',
    CHANGES_REQUESTED: 'Changes requested',
  })[status] ?? status.replaceAll('_', ' ').toLowerCase();

export default function ProjectRequirementsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId, user } = useAuth();
  const client = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const query = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectObligations(projectId),
  });
  const project = useQuery({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const canReview =
    ['REVIEWER', 'APPROVER'].includes(project.data?.viewerRole ?? '') ||
    user?.companies?.some(
      (membership) =>
        membership.companyId === activeCompanyId && membership.role === 'ADMIN',
    );
  const canEditEvidence = canReview || project.data?.viewerRole === 'OWNER';
  const artifacts = (project.data?.sections ?? []).flatMap(
    (section) => section.artifacts ?? [],
  );
  const documents = project.data?.documents ?? [];
  const changeEvidence = useMutation({
    mutationFn: async (
      input: { obligationId: string } & (
        | { unlinkId: string }
        | { artifactId?: string; documentId?: string }
      ),
    ) => {
      if ('unlinkId' in input) {
        await unlinkObligationEvidence(
          projectId,
          input.obligationId,
          input.unlinkId,
        );
      } else {
        await linkObligationEvidence(projectId, input.obligationId, {
          artifactId: input.artifactId,
          documentId: input.documentId,
        });
      }
    },
    onSuccess: (_, input) => {
      void Promise.all([
        client.invalidateQueries({
          queryKey: [
            'obligationEvidence',
            projectId,
            input.obligationId,
            activeCompanyId,
          ],
        }),
        client.invalidateQueries({
          queryKey: [
            'obligation-traceability',
            projectId,
            input.obligationId,
            activeCompanyId,
          ],
        }),
        client.invalidateQueries({
          queryKey: ['obligations', projectId, activeCompanyId],
        }),
      ]);
    },
  });
  const update = useMutation({
    mutationFn: (input: {
      id: string;
      priority?: string;
      ownerId?: string;
      dueAt?: string;
      approvalState?: 'READY_FOR_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED';
      status?: 'UNDER_REVIEW' | 'IN_PROGRESS' | 'COMPLETE';
    }) =>
      updateProjectObligation(projectId, input.id, {
        priority: input.priority,
        ownerId: input.ownerId,
        dueAt: input.dueAt,
        approvalState: input.approvalState,
        status: input.status,
      }),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ['obligations', projectId, activeCompanyId],
      });
      void client.invalidateQueries({
        queryKey: ['project-workflow-summary', projectId, activeCompanyId],
      });
    },
  });
  const membersQuery = useQuery({
    queryKey: ['projectReviewers', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectReviewers(projectId),
  });
  const allItems = query.data ?? [];
  const evidenceQueries = useQueries({
    queries: allItems.map((item) => ({
      queryKey: ['obligationEvidence', projectId, item.id, activeCompanyId],
      enabled: Boolean(token && projectId && activeCompanyId),
      queryFn: () => listObligationEvidence(projectId, item.id),
    })),
  });
  const evidenceByRequirement = new Map(
    allItems.map((item, index) => [
      item.id,
      evidenceQueries[index]?.data ?? [],
    ]),
  );
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const items = (query.data ?? []).filter(
    (item) =>
      (filter === 'ALL' || item.approvalState === filter) &&
      (statusFilter === 'ALL' || item.status === statusFilter) &&
      (ownerFilter === 'ALL' || item.owner?.id === ownerFilter) &&
      (priorityFilter === 'ALL' || item.priority === priorityFilter) &&
      (categoryFilter === 'ALL' ||
        (item.obligation.key ?? '').split('-')[0] === categoryFilter),
  );
  const categories = Array.from(
    new Set(
      allItems
        .map((item) => (item.obligation.key ?? '').split('-')[0])
        .filter(Boolean),
    ),
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
          <span className="mt-2 inline-flex">
            <HelpTooltip label="About requirements">
              Start with the highlighted task. Planning controls and legal
              metadata are shown on each requirement.
            </HelpTooltip>
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <select
            aria-label="Filter requirement status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="COMPLETE">Complete</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter requirement owner"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All owners</option>
              {Array.from(
                new Map(
                  allItems
                    .filter((item) => item.owner)
                    .map((item) => [item.owner!.id, item.owner!.email]),
                ),
              ).map(([id, email]) => (
                <option key={id} value={id}>
                  {email}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter requirement priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <select
              aria-label="Filter obligation category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter requirement approval state"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">All review stages</option>
              <option value="DRAFT">Draft</option>
              <option value="READY_FOR_REVIEW">Ready for review</option>
              <option value="APPROVED">Approved</option>
              <option value="CHANGES_REQUESTED">Changes requested</option>
            </select>
          </div>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                id={`requirement-${item.id}`}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {item.obligation.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {requirementStatusLabel(item.status)} ·{' '}
                      {reviewStageLabel(item.approvalState)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950">
                  <p className="font-semibold">Start here</p>
                  <p className="mt-1">
                    {nextTask(item, evidenceByRequirement.get(item.id) ?? [])}
                  </p>
                </div>
                <RequirementTraceability
                  projectId={projectId}
                  requirement={item}
                  evidence={evidenceByRequirement.get(item.id) ?? []}
                />
                {canEditEvidence && (
                  <details className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Manage linked evidence
                    </summary>
                    <ul className="my-2 space-y-1">
                      {(evidenceByRequirement.get(item.id) ?? []).map(
                        (link) => (
                          <li
                            key={link.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span>
                              {link.artifact?.originalName ??
                                DOCUMENT_LABELS[link.document?.type ?? ''] ??
                                link.document?.type ??
                                'Linked evidence'}
                            </span>
                            <button
                              type="button"
                              className="hz-button hz-button--outline"
                              disabled={changeEvidence.isPending}
                              onClick={() =>
                                changeEvidence.mutate({
                                  obligationId: item.id,
                                  unlinkId: link.id,
                                })
                              }
                            >
                              Remove link
                            </button>
                          </li>
                        ),
                      )}
                    </ul>
                    <label>
                      Link existing evidence
                      <select
                        value=""
                        className="ml-2 rounded border border-slate-300 p-1"
                        disabled={changeEvidence.isPending}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!value) return;
                          const target = value.startsWith('doc:')
                            ? { documentId: value.slice(4) }
                            : { artifactId: value };
                          changeEvidence.mutate({
                            obligationId: item.id,
                            ...target,
                          });
                        }}
                      >
                        <option value="">Choose a file</option>
                        {artifacts
                          .filter(
                            (artifact) =>
                              !(evidenceByRequirement.get(item.id) ?? []).some(
                                (link) => link.artifact?.id === artifact.id,
                              ),
                          )
                          .map((artifact) => (
                            <option key={artifact.id} value={artifact.id}>
                              {artifact.originalName} · v{artifact.version}
                            </option>
                          ))}
                        {documents
                          .filter(
                            (document) =>
                              !(evidenceByRequirement.get(item.id) ?? []).some(
                                (link) => link.document?.id === document.id,
                              ),
                          )
                          .map((document) => (
                            <option
                              key={document.id}
                              value={`doc:${document.id}`}
                            >
                              {DOCUMENT_LABELS[document.type] ?? document.type}{' '}
                              · v{document.version ?? 1}
                            </option>
                          ))}
                      </select>
                    </label>
                    {changeEvidence.isError &&
                      changeEvidence.variables?.obligationId === item.id && (
                        <p role="alert" className="mt-2 text-rose-700">
                          Could not update the evidence link. Try again.
                        </p>
                      )}
                  </details>
                )}
                {update.isError && update.variables?.id === item.id && (
                  <p role="alert" className="mt-3 text-sm text-rose-700">
                    {isAxiosError<{ message?: string }>(update.error)
                      ? (update.error.response?.data.message ??
                        'Unable to save requirement')
                      : 'Unable to save requirement'}
                  </p>
                )}
                {item.status !== 'NOT_APPLICABLE' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.data?.viewerRole === 'OWNER' &&
                      ['DRAFT', 'CHANGES_REQUESTED'].includes(
                        item.approvalState,
                      ) && (
                        <button
                          type="button"
                          className="hz-button hz-button--outline"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: item.id,
                              status: 'UNDER_REVIEW',
                              approvalState: 'READY_FOR_REVIEW',
                            })
                          }
                        >
                          Request requirement review
                        </button>
                      )}
                    {canReview && item.approvalState === 'READY_FOR_REVIEW' && (
                      <>
                        <button
                          type="button"
                          className="hz-button hz-button--outline"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: item.id,
                              status: 'COMPLETE',
                              approvalState: 'APPROVED',
                            })
                          }
                        >
                          Approve requirement
                        </button>
                        <button
                          type="button"
                          className="hz-button hz-button--outline"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: item.id,
                              status: 'IN_PROGRESS',
                              approvalState: 'CHANGES_REQUESTED',
                            })
                          }
                        >
                          Request changes
                        </button>
                      </>
                    )}
                  </div>
                )}
                <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Planning and audit details
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Priority
                      <select
                        aria-label={`Priority for ${item.obligation.title}`}
                        value={item.priority}
                        onChange={(event) =>
                          update.mutate({
                            id: item.id,
                            priority: event.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal"
                      >
                        <option value="LOW">Low priority</option>
                        <option value="MEDIUM">Medium priority</option>
                        <option value="HIGH">High priority</option>
                        <option value="CRITICAL">Critical priority</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Due date
                      <input
                        type="date"
                        aria-label={`Due date for ${item.obligation.title}`}
                        value={item.dueAt ? item.dueAt.slice(0, 10) : ''}
                        onChange={(event) =>
                          update.mutate({
                            id: item.id,
                            dueAt: event.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Owner
                      <select
                        aria-label={`Owner for ${item.obligation.title}`}
                        value={item.owner?.id ?? ''}
                        onChange={(event) =>
                          event.target.value &&
                          update.mutate({
                            id: item.id,
                            ownerId: event.target.value,
                          })
                        }
                        disabled={
                          update.isPending || !membersQuery.data?.length
                        }
                        className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal disabled:opacity-60"
                      >
                        <option value="">Unassigned</option>
                        {(membersQuery.data ?? []).map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <RequirementMetadata
                    requirement={item.obligation}
                    className="mt-4"
                  />
                </section>
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

function nextTask(
  item: { owner?: { id: string } | null; status: string },
  evidence: unknown[],
) {
  if (!item.owner) return 'Assign an owner below, then add supporting proof.';
  if (!evidence.length)
    return 'Add the policy, test result, or record that shows this requirement is met.';
  if (item.status !== 'SATISFIED')
    return 'Review the evidence and update this requirement when the work is complete.';
  return 'Check that the evidence remains current before sending this requirement for review.';
}
