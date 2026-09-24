import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import api from '@/platform/api/client';
import type {
  DocumentItem,
  ProjectDetail,
} from '@complianx/contracts/ai-systems';
import {
  approveDocument,
  getProject,
  getProjectDocuments,
  listProjectObligations,
  createCompliancePackage,
  listCompliancePackages,
  verifyCompliancePackage,
} from '../api';
import { DOCUMENT_LABELS } from '../constants/documents';
import {
  getPackageGapAction,
  getPackageReadinessFailure,
} from '../lib/package-readiness-errors';

export default function CompliancePackagePage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId, user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [packageGaps, setPackageGaps] = useState<string[]>([]);
  const [verification, setVerification] = useState<
    Record<string, { valid: boolean; errors: string[] }>
  >({});
  const [now] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const packagesQuery = useQuery({
    queryKey: ['compliance-packages', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listCompliancePackages(projectId),
  });
  const createPackageMutation = useMutation({
    mutationFn: () => createCompliancePackage(projectId),
    onMutate: () => setPackageGaps([]),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['compliance-packages', projectId, activeCompanyId],
      });
      toast.success('Package created and saved in the history below');
    },
    onError: (error) => {
      const failure = getPackageReadinessFailure(error);
      setPackageGaps(failure.gaps);
      toast.error(failure.message);
    },
  });
  const projectQuery = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const documentsQuery = useQuery<DocumentItem[]>({
    queryKey: ['documents', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProjectDocuments(projectId),
  });
  const obligationsQuery = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listProjectObligations(projectId),
  });
  const approveDocumentMutation = useMutation({
    mutationFn: (documentId: string) => approveDocument(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['documents', projectId, activeCompanyId],
      });
      toast.success('Document approved by a human reviewer');
    },
    onError: () => toast.error('Unable to approve document'),
  });

  const canCreate =
    ['OWNER', 'REVIEWER', 'APPROVER'].includes(
      projectQuery.data?.viewerRole ?? '',
    ) ||
    user?.companies?.some(
      (membership) =>
        membership.companyId === activeCompanyId && membership.role === 'ADMIN',
    );
  const canApproveDocuments =
    ['REVIEWER', 'APPROVER'].includes(projectQuery.data?.viewerRole ?? '') ||
    user?.companies?.some(
      (membership) =>
        membership.companyId === activeCompanyId && membership.role === 'ADMIN',
    );

  if (!initializing && !token) return <Navigate to="/login" replace />;

  const verifyPackage = async (packageId: string) => {
    try {
      const result = await verifyCompliancePackage(projectId, packageId);
      setVerification((current) => ({ ...current, [packageId]: result }));
      toast[result.valid ? 'success' : 'error'](
        result.valid
          ? 'Package integrity verified'
          : 'Package integrity check failed',
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to verify package',
      );
    }
  };

  const downloadPackage = async (packageId: string) => {
    if (!token) return;
    setDownloading(true);
    try {
      const response = await fetch(
        `${api.defaults.baseURL}/ai-systems/${projectId}/reports/packages/${packageId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(activeCompanyId ? { 'X-Company-Id': activeCompanyId } : {}),
          },
        },
      );
      if (!response.ok) throw new Error('Unable to download package');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-package-${packageId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Package download started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppShell title="Audit package" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to={`/projects/${projectId}`}
              className="text-sm text-slate-500 hover:text-sky-600"
            >
              ← Back to project
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              {projectQuery.data?.name ?? 'Audit package'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              The export-ready record of approved evidence and human decisions
              for this AI system.
            </p>
          </div>
          <button
            type="button"
            onClick={() => createPackageMutation.mutate()}
            disabled={!canCreate || createPackageMutation.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {createPackageMutation.isPending
              ? 'Creating package…'
              : 'Create package'}
          </button>
        </div>
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">A person must check the work first</p>
          <p className="mt-1 text-sky-800">
            AI suggestions and draft documents are not enough on their own.
            Someone must record the required decisions for the classification,
            evidence, requirements, documents, and this project before a
            package can be created.
          </p>
        </section>
        {packageGaps.length ? (
          <section
            aria-labelledby="package-readiness-heading"
            className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"
          >
            <h2 id="package-readiness-heading" className="font-semibold">
              This package is not ready yet
            </h2>
            <p className="mt-1 text-amber-900">
              Complete these decisions, then try again.
            </p>
            <ul className="mt-4 space-y-3">
              {packageGaps.map((gap, index) => {
                const action = getPackageGapAction(projectId, gap);
                return (
                  <li
                    key={`${gap}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3"
                  >
                    <span>{gap}</span>
                    <Link
                      to={action.to}
                      className="font-semibold text-amber-900 underline underline-offset-2"
                    >
                      {action.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        <section
          id="package-documents"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            <span className="text-sm text-slate-500">
              {documentsQuery.data?.length ?? 0} files
            </span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {(documentsQuery.data ?? []).map((document) => (
              <div
                key={document.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {DOCUMENT_LABELS[document.type] ?? document.type}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Version {document.version ?? 1} ·{' '}
                    {document.approvalState ?? 'DRAFT'} ·{' '}
                    {document.lifecycleStatus ?? 'CURRENT'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {new Date(document.createdAt).toLocaleDateString()}
                  </span>
                  {document.approvalState !== 'APPROVED' &&
                  canApproveDocuments ? (
                    <button
                      type="button"
                      onClick={() =>
                        approveDocumentMutation.mutate(document.id)
                      }
                      disabled={approveDocumentMutation.isPending}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Approve document
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {!documentsQuery.isLoading && !documentsQuery.data?.length ? (
              <p className="py-6 text-sm text-slate-500">
                No package documents yet.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Package history
            </h2>
            <span className="text-sm text-slate-500">
              {packagesQuery.data?.length ?? 0} saved packages
            </span>
          </div>
          {packagesQuery.isError ? (
            <button onClick={() => void packagesQuery.refetch()}>
              Could not load package history. Try again
            </button>
          ) : null}
          <div className="mt-4 divide-y divide-slate-100">
            {(packagesQuery.data ?? []).map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    Package v{pkg.version}
                  </p>
                  <p className="text-xs text-slate-500">
                    {pkg.status} · {pkg.manifestHash.slice(0, 12)}…
                  </p>
                  {pkg.manifest?.completeness?.gaps.length ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-slate-500">
                      {pkg.manifest.completeness.gaps.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(pkg.createdAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  disabled={downloading || !pkg.archiveHash}
                  onClick={() => void downloadPackage(pkg.id)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {pkg.archiveHash
                    ? `Download v${pkg.version}`
                    : 'Archive unavailable'}
                </button>
                <button
                  type="button"
                  onClick={() => void verifyPackage(pkg.id)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                >
                  Verify integrity
                </button>
                {verification[pkg.id] ? (
                  <span
                    className={`w-full text-xs ${verification[pkg.id].valid ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {verification[pkg.id].valid
                      ? 'Integrity verified'
                      : (verification[pkg.id].errors[0] ??
                        'Verification failed')}
                  </span>
                ) : null}
              </div>
            ))}
            {!packagesQuery.data?.length ? (
              <p className="py-4 text-sm text-slate-500">
                No packages created yet.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Ready to package
            </h2>
            <span className="text-sm text-slate-500">
              {obligationsQuery.data?.filter(
                (item) => item.approvalState !== 'APPROVED',
              ).length ?? 0}{' '}
              gaps
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Summary
              label="Requirements"
              value={String(obligationsQuery.data?.length ?? 0)}
            />
            <Summary
              label="Still needs a decision"
              value={String(
                obligationsQuery.data?.filter(
                  (item) => item.approvalState !== 'APPROVED',
                ).length ?? 0,
              )}
            />
            <Summary
              label="Audit events"
              value={String(projectQuery.data?.statusEvents?.length ?? 0)}
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Evidence index
            </h2>
            <span className="text-sm text-slate-500">
              {(projectQuery.data?.sections ?? []).reduce(
                (count, section) => count + (section.artifacts?.length ?? 0),
                0,
              )}{' '}
              items
            </span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {(projectQuery.data?.sections ?? []).flatMap((section) =>
              (section.artifacts ?? []).map((artifact) => (
                <div
                  key={artifact.id}
                  className="flex flex-wrap justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {artifact.originalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {section.name} · {artifact.citationKey}
                    </p>
                  </div>
                  <span
                    className={`text-xs ${artifact.expiresAt && new Date(artifact.expiresAt).getTime() < now ? 'font-semibold text-rose-600' : 'text-slate-500'}`}
                  >
                    {artifact.expiresAt &&
                    new Date(artifact.expiresAt).getTime() < now
                      ? `Expired ${new Date(artifact.expiresAt).toLocaleDateString()}`
                      : artifact.expiresAt
                        ? `Expires ${new Date(artifact.expiresAt).toLocaleDateString()}`
                        : 'No expiry recorded'}
                  </span>
                </div>
              )),
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
