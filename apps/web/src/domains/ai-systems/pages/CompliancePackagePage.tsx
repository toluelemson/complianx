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
  getProject,
  getProjectDocuments,
  listProjectObligations,
  createCompliancePackage,
  listCompliancePackages,
} from '../api';
import { DOCUMENT_LABELS } from '../constants/documents';

export default function CompliancePackagePage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [now] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const packagesQuery = useQuery({
    queryKey: ['compliance-packages', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => listCompliancePackages(projectId),
  });
  const createPackageMutation = useMutation({
    mutationFn: () => createCompliancePackage(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['compliance-packages', projectId, activeCompanyId],
      });
      toast.success('Compliance package snapshot created');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to create package snapshot',
      );
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

  if (!initializing && !token) return <Navigate to="/login" replace />;

  const downloadPackage = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const response = await fetch(
        `${api.defaults.baseURL}/projects/${projectId}/documents.zip`,
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
      link.download = `${projectQuery.data?.name ?? 'project'}-compliance-package.zip`;
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
    <AppShell title="Compliance package" projectId={projectId}>
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
              {projectQuery.data?.name ?? 'Compliance package'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Audit-ready documents, evidence references, and workflow history.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadPackage}
            disabled={downloading || !documentsQuery.data?.length}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : 'Download package'}
          </button>
          <button
            type="button"
            onClick={() => createPackageMutation.mutate()}
            disabled={createPackageMutation.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {createPackageMutation.isPending
              ? 'Saving…'
              : 'Save manifest snapshot'}
          </button>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                <span className="text-xs text-slate-400">
                  {new Date(document.createdAt).toLocaleDateString()}
                </span>
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
              Manifest history
            </h2>
            <span className="text-sm text-slate-500">
              {packagesQuery.data?.length ?? 0} snapshots
            </span>
          </div>
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
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(pkg.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
            {!packagesQuery.data?.length ? (
              <p className="py-4 text-sm text-slate-500">
                No manifest snapshots created yet.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Package version history
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from(
              (documentsQuery.data ?? []).reduce((groups, document) => {
                const versions = groups.get(document.type) ?? [];
                versions.push(document.version ?? 1);
                groups.set(document.type, versions);
                return groups;
              }, new Map<string, number[]>()),
            ).map(([type, versions]) => (
              <div
                key={type}
                className="rounded-xl border border-slate-100 p-4"
              >
                <p className="text-sm font-medium text-slate-900">
                  {DOCUMENT_LABELS[type] ?? type}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Versions{' '}
                  {Array.from(new Set(versions))
                    .sort((a, b) => b - a)
                    .join(', ')}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Preparation summary
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
              label="Needs approval"
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
