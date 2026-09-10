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
    <AppShell
      title={projectQuery.data?.name ?? 'Project overview'}
      projectId={projectId}
    >
      <div className="hz-console-content space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
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
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <h2 className="text-base font-semibold text-sky-950">
            Classification
          </h2>
          <p className="mt-1 text-sm text-sky-800">
            Complete the guided questionnaire to determine which EU AI Act
            requirements apply.
          </p>
          <Link
            to={`/projects/${projectId}/classification`}
            className="mt-3 inline-block rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Open questionnaire →
          </Link>
        </section>
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-base font-semibold text-amber-950">
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
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">
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
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
