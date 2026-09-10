import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectDetail } from '@complianx/contracts/ai-systems';
import { getProject, getProjectSections } from '../api';
import { useProjectEvidence } from '../hooks/useProjectEvidence';

export default function ProjectEvidencePage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
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
  const currentSection = sectionsQuery.data?.[0];
  const evidence = useProjectEvidence(
    projectId,
    token,
    currentSection,
    query.data?.viewerRole === 'OWNER',
    query.data?.viewerRole === 'REVIEWER' ||
      query.data?.viewerRole === 'APPROVER',
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
  } = evidence;
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const projectEvidence = (query.data?.sections ?? []).flatMap((section) =>
    (section.artifacts ?? []).map((artifact) => ({
      ...artifact,
      section: section.name,
    })),
  );
  const [now] = useState(() => Date.now());
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
          <p className="mt-1 text-sm text-slate-500">
            All project evidence, provenance, review state, and expiry dates.
          </p>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Add evidence</h2>
            <p className="mt-1 text-xs text-slate-500">
              Evidence is attached to the first available project section and
              can be linked to requirements afterward.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                ref={artifactInputRef}
                type="file"
                onChange={handleArtifactFileChange}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <input
                value={artifactSource}
                onChange={(event) => setArtifactSource(event.target.value)}
                placeholder="Source or system of record"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={artifactDescription}
                onChange={(event) => setArtifactDescription(event.target.value)}
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
              return (
                <article
                  key={artifact.id}
                  className="flex flex-wrap justify-between gap-3 py-4"
                >
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {artifact.originalName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {artifact.section} · {artifact.citationKey} ·{' '}
                      {artifact.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {artifact.source ?? 'Source not recorded'}
                      {artifact.externalUrl ? ' · External link recorded' : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs ${expired ? 'font-semibold text-rose-600' : 'text-slate-500'}`}
                  >
                    {expired
                      ? 'Expired'
                      : artifact.expiresAt
                        ? `Expires ${new Date(artifact.expiresAt).toLocaleDateString()}`
                        : 'No expiry'}
                  </span>
                </article>
              );
            })}
            {!projectEvidence.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No evidence uploaded yet.
              </p>
            ) : null}
          </div>
        </section>
        <div className="flex justify-end">
          <Link
            to={`/projects/${projectId}/data_governance`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Manage evidence
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
