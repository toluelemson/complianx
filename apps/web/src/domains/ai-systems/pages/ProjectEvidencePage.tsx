import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { HelpTooltip } from '@/shared/components/ui/help-tooltip';
import type { ProjectDetail } from '@complianx/contracts/ai-systems';
import {
  getProject,
  getProjectSections,
  linkObligationEvidence,
  listProjectObligations,
} from '../api';
import { useProjectEvidence } from '../hooks/useProjectEvidence';
import { RequirementMetadata } from '../components/RequirementMetadata';

const evidenceStatusLabel = (status: string) =>
  ({
    PENDING: 'Waiting for review',
    APPROVED: 'Accepted',
    REJECTED: 'Rejected',
  })[status] ?? status.replaceAll('_', ' ').toLowerCase();

export default function ProjectEvidencePage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId, user } = useAuth();
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>('');
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<
    string[]
  >([]);
  const [linkType, setLinkType] = useState<
    'PRIMARY' | 'SUPPORTING' | 'REFERENCE'
  >('SUPPORTING');
  const query = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const sectionsQuery = useQuery({
    queryKey: ['sections', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProjectSections(projectId),
  });
  const requirementsQuery = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectObligations(projectId),
  });
  const bulkLinkMutation = useMutation({
    mutationFn: async () =>
      Promise.all(
        selectedRequirementIds.map((requirementId) =>
          linkObligationEvidence(projectId, requirementId, {
            artifactId: selectedArtifactId,
            linkType,
          }),
        ),
      ),
    onSuccess: () => {
      setSelectedRequirementIds([]);
      void queryClient.invalidateQueries({
        queryKey: ['obligations', projectId],
      });
    },
  });
  const currentSection = sectionsQuery.data?.[0];
  const canReviewEvidence =
    ['REVIEWER', 'APPROVER'].includes(query.data?.viewerRole ?? '') ||
    user?.companies?.some(
      (membership) =>
        membership.companyId === activeCompanyId && membership.role === 'ADMIN',
    ) === true;
  const evidence = useProjectEvidence(
    projectId,
    token,
    currentSection,
    query.data?.viewerRole === 'OWNER',
    canReviewEvidence,
    () => {
      void sectionsQuery.refetch();
      void query.refetch();
    },
  );
  const {
    artifactInputRef,
    artifactFile,
    artifactSource,
    setArtifactSource,
    artifactDescription,
    setArtifactDescription,
    artifactExpiresAt,
    setArtifactExpiresAt,
    handleArtifactFileChange,
    handleArtifactUpload,
    artifactUploadMutation,
    artifactReviewDraft,
    handleArtifactReviewStatusChange,
    handleArtifactReviewCommentChange,
    handleArtifactReviewSubmit,
    artifactReviewMutation,
  } = evidence;
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const projectEvidence = (query.data?.sections ?? []).flatMap((section) =>
    (section.artifacts ?? []).map((artifact) => ({
      ...artifact,
      section: section.name,
    })),
  );
  const soon = now + 30 * 24 * 60 * 60 * 1000;
  const expiredEvidence = projectEvidence.filter(
    (artifact) =>
      artifact.expiresAt && new Date(artifact.expiresAt).getTime() < now,
  );
  const expiringEvidence = projectEvidence.filter((artifact) => {
    const expiry = artifact.expiresAt
      ? new Date(artifact.expiresAt).getTime()
      : null;
    return expiry && expiry >= now && expiry <= soon;
  });
  const rejectedEvidence = projectEvidence.filter(
    (artifact) => artifact.status === 'REJECTED',
  );
  return (
    <AppShell title="Evidence" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Evidence
          </h1>
          <HelpTooltip className="mt-2" label="About evidence">
            Files that support your work, including their source, review status,
            and expiry dates.
          </HelpTooltip>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {expiredEvidence.length ||
          expiringEvidence.length ||
          rejectedEvidence.length ? (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Some files need attention</p>
              <ul className="mt-2 space-y-1">
                {expiredEvidence.length ? (
                  <li>
                    • {expiredEvidence.length} expired evidence item
                    {expiredEvidence.length === 1 ? '' : 's'}
                  </li>
                ) : null}
                {expiringEvidence.length ? (
                  <li>
                    • {expiringEvidence.length} item
                    {expiringEvidence.length === 1 ? '' : 's'} expiring within
                    30 days
                  </li>
                ) : null}
                {rejectedEvidence.length ? (
                  <li>
                    • {rejectedEvidence.length} rejected item
                    {rejectedEvidence.length === 1 ? '' : 's'} to replace
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          <div className="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <h2 className="flex items-center gap-1 font-semibold text-slate-900">
              Add evidence
              <HelpTooltip label="About adding evidence">
                This file is added to the first section. You can move or link it
                later.
              </HelpTooltip>
            </h2>
            {!currentSection ? (
              <div
                role="status"
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                Save a section before adding a file.{' '}
                <Link
                  to={`/projects/${projectId}/compliance-workspace`}
                  className="font-semibold underline"
                >
                  Open project
                </Link>
                .
              </div>
            ) : null}
            <div className="mt-3">
              <input
                ref={artifactInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv,.json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/json"
                onChange={handleArtifactFileChange}
                disabled={!currentSection}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-600">
                Optional file details
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={artifactSource}
                  onChange={(event) => setArtifactSource(event.target.value)}
                  placeholder="Source or system of record"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={artifactDescription}
                  onChange={(event) =>
                    setArtifactDescription(event.target.value)
                  }
                  placeholder="Description"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={artifactExpiresAt}
                  onChange={(event) => setArtifactExpiresAt(event.target.value)}
                  aria-label="Evidence expiry date"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleArtifactUpload}
                disabled={
                  !artifactFile ||
                  artifactUploadMutation.isPending ||
                  !currentSection
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {artifactUploadMutation.isPending
                  ? 'Uploading…'
                  : 'Upload evidence'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {projectEvidence.map((artifact) => {
              const expired =
                artifact.expiresAt &&
                new Date(artifact.expiresAt).getTime() < now;
              const expiringSoon =
                artifact.expiresAt &&
                !expired &&
                new Date(artifact.expiresAt).getTime() <= soon;
              return (
                <article
                  key={artifact.id}
                  id={`evidence-${artifact.id}`}
                  className="flex flex-wrap justify-between gap-3 py-4"
                >
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {artifact.originalName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {artifact.section} ·{' '}
                      {evidenceStatusLabel(artifact.status)}
                      {artifact.status === 'REJECTED'
                        ? ' · Replace required'
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {artifact.source ?? 'No source added'}
                      {artifact.externalUrl ? ' · Link added' : ''}
                    </p>
                  </div>
                  {canReviewEvidence && (
                    <form
                      className="mt-3 flex flex-wrap items-end gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleArtifactReviewSubmit(artifact.id);
                      }}
                    >
                      <label className="text-sm">
                        Decision
                        <select
                          className="ml-2 rounded border border-slate-200 p-1"
                          value={
                            artifactReviewDraft[artifact.id]?.status ??
                            artifact.status
                          }
                          onChange={(event) => {
                            const value = event.target.value;
                            if (
                              value === 'PENDING' ||
                              value === 'APPROVED' ||
                              value === 'REJECTED'
                            ) {
                              handleArtifactReviewStatusChange(
                                artifact.id,
                                value,
                              );
                            }
                          }}
                        >
                          <option value="PENDING">Waiting for review</option>
                          <option value="APPROVED">Accept</option>
                          <option value="REJECTED">Reject</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        Review note
                        <input
                          className="ml-2 rounded border border-slate-200 p-1"
                          value={
                            artifactReviewDraft[artifact.id]?.comment ??
                            artifact.reviewComment ??
                            ''
                          }
                          onChange={(event) =>
                            handleArtifactReviewCommentChange(
                              artifact.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <button
                        type="submit"
                        className="hz-button hz-button--outline"
                        disabled={
                          artifactReviewMutation.isPending ||
                          !artifactReviewDraft[artifact.id]
                        }
                      >
                        Save decision
                      </button>
                    </form>
                  )}
                  <span
                    className={`text-xs ${expired || artifact.status === 'REJECTED' ? 'font-semibold text-rose-600' : expiringSoon ? 'font-semibold text-amber-700' : 'text-slate-500'}`}
                  >
                    {artifact.status === 'REJECTED'
                      ? 'Rejected — replace evidence'
                      : expired
                        ? 'Expired'
                        : expiringSoon
                          ? `Expires soon: ${new Date(artifact.expiresAt!).toLocaleDateString()}`
                          : artifact.expiresAt
                            ? `Expires ${new Date(artifact.expiresAt).toLocaleDateString()}`
                            : 'No expiry'}
                  </span>
                </article>
              );
            })}
            {!projectEvidence.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No files added yet.
              </p>
            ) : null}
          </div>
        </section>
        {projectEvidence.length && (requirementsQuery.data?.length ?? 0) > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Use one file for more than one requirement
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Link a file to every requirement it supports.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                File
                <select
                  value={selectedArtifactId}
                  onChange={(event) =>
                    setSelectedArtifactId(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="">Select evidence</option>
                  {projectEvidence.map((artifact) => (
                    <option key={artifact.id} value={artifact.id}>
                      {artifact.originalName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                How this file helps
                <select
                  value={linkType}
                  onChange={(event) =>
                    setLinkType(event.target.value as typeof linkType)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="PRIMARY">Main proof</option>
                  <option value="SUPPORTING">Extra proof</option>
                  <option value="REFERENCE">Helpful reference</option>
                </select>
              </label>
            </div>
            <fieldset className="mt-4 grid gap-2 md:grid-cols-2">
              <legend className="text-sm font-medium text-slate-700">
                Requirements this file supports
              </legend>
              {(requirementsQuery.data ?? []).map((requirement) => (
                <label
                  key={requirement.id}
                  id={`requirement-${requirement.id}`}
                  className="flex gap-2 rounded-lg border border-slate-100 p-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedRequirementIds.includes(requirement.id)}
                    onChange={(event) =>
                      setSelectedRequirementIds((current) =>
                        event.target.checked
                          ? [...current, requirement.id]
                          : current.filter((id) => id !== requirement.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      {requirement.obligation.title}
                    </span>
                    <RequirementMetadata
                      requirement={requirement.obligation}
                      className="mt-1"
                    />
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {selectedRequirementIds.length} requirement
                {selectedRequirementIds.length === 1 ? '' : 's'} selected
              </p>
              <button
                type="button"
                onClick={() => bulkLinkMutation.mutate()}
                disabled={
                  !selectedArtifactId ||
                  !selectedRequirementIds.length ||
                  bulkLinkMutation.isPending
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {bulkLinkMutation.isPending ? 'Linking…' : 'Link evidence'}
              </button>
            </div>
          </section>
        ) : null}
        <div className="flex justify-end">
          <Link
            to={`/projects/${projectId}/compliance-workspace`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open project
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
