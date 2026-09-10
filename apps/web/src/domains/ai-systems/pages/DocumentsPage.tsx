import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectListItem } from '@complianx/contracts/ai-systems';
import { listProjects } from '../api';
import { DOCUMENT_LABELS } from '../constants/documents';
import api from '@/platform/api/client';
import { trackMarketingEvent } from '@/platform/analytics/marketing';

export default function DocumentsPage() {
  const { token, initializing, activeCompanyId } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const query = useQuery<ProjectListItem[]>({
    queryKey: ['projects', activeCompanyId],
    enabled: Boolean(token && activeCompanyId),
    queryFn: listProjects,
  });
  const documents = useMemo(
    () =>
      (query.data ?? [])
        .flatMap((project) =>
          project.documents.map((document) => ({ ...document, project })),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [query.data],
  );
  const lifecycleCounts = useMemo(
    () =>
      documents.reduce(
        (counts, document) => {
          const status = document.lifecycleStatus ?? 'CURRENT';
          if (status === 'FAILED') counts.failed += 1;
          else if (status === 'SUPERSEDED') counts.superseded += 1;
          else if (document.approvalState === 'APPROVED') counts.approved += 1;
          else counts.draft += 1;
          return counts;
        },
        { approved: 0, draft: 0, superseded: 0, failed: 0 },
      ),
    [documents],
  );

  const downloadDocument = async (documentId: string, type: string) => {
    if (!token) return;
    setDownloadingId(documentId);
    try {
      const response = await fetch(
        `${api.defaults.baseURL}/documents/${documentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(activeCompanyId ? { 'X-Company-Id': activeCompanyId } : {}),
          },
        },
      );
      if (!response.ok) throw new Error('Unable to download document');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      trackMarketingEvent('package_downloaded');
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Unable to download document',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (!initializing && !token) return <Navigate to="/login" replace />;

  return (
    <AppShell title="Documents">
      <div className="hz-console-content space-y-6">
        <p className="text-sm text-slate-500">Latest packages.</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Approved', lifecycleCounts.approved],
            ['Draft', lifecycleCounts.draft],
            ['Superseded', lifecycleCounts.superseded],
            ['Failed', lifecycleCounts.failed],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {count}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {documents.length ? (
            <div className="divide-y divide-slate-100">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-5"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {DOCUMENT_LABELS[document.type] ?? document.type}
                    </p>
                    <Link
                      to={`/projects/${document.project.id}`}
                      className="text-sm text-slate-500 hover:text-sky-600"
                    >
                      {document.project.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-400">
                      v{document.version ?? 1} ·{' '}
                      {document.approvalState ?? 'DRAFT'} ·{' '}
                      {document.lifecycleStatus ?? 'CURRENT'} ·{' '}
                      {document.provenanceStatus ?? 'UNVERIFIED'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Regulatory content:{' '}
                      {document.regulatoryContentVersion ?? 'Not recorded'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        downloadDocument(document.id, document.type)
                      }
                      disabled={downloadingId === document.id}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {downloadingId === document.id
                        ? 'Downloading…'
                        : 'Download'}
                    </button>
                    {document.project.viewerRole === 'OWNER' ? (
                      <Link
                        to={`/projects/${document.project.id}#documents`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Regenerate
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              {query.isLoading ? 'Loading...' : 'No packages yet.'}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
