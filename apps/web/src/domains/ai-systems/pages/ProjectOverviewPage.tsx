import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type {
  ProjectDetail,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import { getProject, getProjectDocuments, getProjectSections } from '../api';

export default function ProjectOverviewPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const projectQuery = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const sectionsQuery = useQuery<SectionWithMeta[]>({
    queryKey: ['sections', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProjectSections(projectId),
  });
  const documentsQuery = useQuery({
    queryKey: ['documents', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProjectDocuments(projectId),
  });
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const completed = (sectionsQuery.data ?? []).filter(
    (section) => Object.keys(section.content ?? {}).length > 0,
  ).length;
  const blockers = [
    ...(sectionsQuery.data ?? [])
      .filter((section) => !Object.keys(section.content ?? {}).length)
      .map((section) => `Complete ${section.name.replaceAll('_', ' ')}`),
    ...(!documentsQuery.data?.length
      ? ['Generate the compliance package']
      : []),
  ];
  return (
    <AppShell title="Project overview" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <p className="text-sm text-slate-500">Project workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {projectQuery.data?.name ?? 'Project overview'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {projectQuery.data?.description ||
              'Track readiness, ownership, and the next compliance action.'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Summary
            label="Workflow status"
            value={(projectQuery.data?.workflowStatus ?? 'DRAFT').replaceAll(
              '_',
              ' ',
            )}
          />
          <Summary
            label="Sections complete"
            value={`${completed}/${sectionsQuery.data?.length ?? 0}`}
          />
          <Summary
            label="Due date"
            value={
              projectQuery.data?.dueDate
                ? new Date(projectQuery.data.dueDate).toLocaleDateString()
                : 'Not set'
            }
          />
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Continue this project
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['Requirements', 'requirements'],
              ['Evidence', 'evidence'],
              ['Compliance package', 'compliance-package'],
              ['Messages', 'messages'],
            ].map(([label, key]) => (
              <Link
                key={key}
                to={`/projects/${projectId}/${key}`}
                className="rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
              >
                {label} →
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-950">
            Preparation stage
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            {blockers.length
              ? 'Resolve these blockers before review.'
              : 'The project is ready for the next workflow stage.'}
          </p>
          {blockers.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {blockers.slice(0, 6).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Regulatory updates
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Keep evidence and risk decisions aligned with current EU AI Act
            obligations.
          </p>
          <Link
            to={`/projects/${projectId}/requirements`}
            className="mt-3 inline-block text-sm font-semibold text-sky-600"
          >
            Review mapped requirements →
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
