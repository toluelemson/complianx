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

type DocumentWithProject = ProjectListItem['documents'][number] & {
  project: ProjectListItem;
};
type DocumentStatus = 'APPROVED' | 'DRAFT' | 'SUPERSEDED' | 'FAILED';

const DOCUMENT_STATUS_OPTIONS: Array<{
  value: DocumentStatus;
  label: string;
}> = [
  { value: 'APPROVED', label: 'Ready' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUPERSEDED', label: 'Older version' },
  { value: 'FAILED', label: 'Needs attention' },
];

export default function DocumentsPage() {
  const { token, initializing, activeCompanyId } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>(
    'ALL',
  );
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
  const visibleDocuments = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase();
    return documents.filter((document) => {
      const status = getDocumentStatus(document);
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        (DOCUMENT_LABELS[document.type] ?? document.type)
          .toLocaleLowerCase()
          .includes(searchTerm) ||
        document.project.name.toLocaleLowerCase().includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [documents, search, statusFilter]);

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
    <AppShell title="Document library">
      <div className="hz-console-content space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Document library
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Find documents made for your AI systems. Open a package when you
            need its full review and download record.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4" aria-label="Document status">
          {DOCUMENT_STATUS_OPTIONS.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              onClick={() =>
                setStatusFilter((current) =>
                  current === value ? 'ALL' : value,
                )
              }
              aria-pressed={statusFilter === value}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-400 aria-pressed:border-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {lifecycleCounts[
                  value === 'APPROVED'
                    ? 'approved'
                    : value === 'DRAFT'
                      ? 'draft'
                      : value === 'SUPERSEDED'
                        ? 'superseded'
                        : 'failed'
                ]}
              </p>
            </button>
          ))}
        </div>
        <label className="block max-w-xl">
          <span className="text-sm font-medium text-slate-700">
            Find a document
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by document or AI system name"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {visibleDocuments.length ? (
            <div className="divide-y divide-slate-100">
              {visibleDocuments.map((document) => (
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
                      AI system: {document.project.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-400">
                      Version {document.version ?? 1} ·{' '}
                      {getDocumentStatusLabel(document)}
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
                        to={`/projects/${document.project.id}/compliance-workspace#documents`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Regenerate
                      </Link>
                    ) : null}
                    <Link
                      to={`/projects/${document.project.id}/compliance-package`}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open package
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              {query.isLoading
                ? 'Loading documents…'
                : documents.length
                  ? 'No documents match your search.'
                  : 'No documents yet. Generate one from an AI system when you are ready.'}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function getDocumentStatus(document: DocumentWithProject): DocumentStatus {
  if (document.lifecycleStatus === 'FAILED') return 'FAILED';
  if (document.lifecycleStatus === 'SUPERSEDED') return 'SUPERSEDED';
  return document.approvalState === 'APPROVED' ? 'APPROVED' : 'DRAFT';
}

function getDocumentStatusLabel(document: DocumentWithProject) {
  const status = getDocumentStatus(document);
  return {
    APPROVED: 'Ready',
    DRAFT: 'Draft',
    SUPERSEDED: 'Older version',
    FAILED: 'Needs attention',
  }[status];
}
