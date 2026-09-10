import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectDetail } from '@complianx/contracts/ai-systems';
import { getProject } from '../api';

const organizationFields = [
  ['industry', 'Industry'],
  ['responsibleOwner', 'Responsible owner'],
  ['providerOrDeveloper', 'Provider / developer'],
  ['deployerOrUser', 'Deployer / user'],
  ['importer', 'Importer'],
  ['distributor', 'Distributor'],
  ['authorizedRepresentative', 'Authorized representative'],
];
const systemFields = [
  ['description', 'Description'],
  ['businessPurpose', 'Business purpose'],
  ['intendedUse', 'Intended use'],
  ['intendedUsers', 'Intended users'],
  ['affectedPersons', 'Affected persons'],
  ['deploymentGeography', 'Deployment geography'],
  ['lifecycleStage', 'Lifecycle stage'],
];

export default function ProjectProfilePage() {
  const { projectId = '', profileKey = 'ai-system-profile' } = useParams<{
    projectId: string;
    profileKey: string;
  }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const query = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const organization = profileKey === 'organization-profile';
  const fields = organization ? organizationFields : systemFields;
  return (
    <AppShell
      title={organization ? 'Organization profile' : 'AI system profile'}
      projectId={projectId}
    >
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {organization ? 'Organization profile' : 'AI system profile'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Reusable facts for {query.data?.name ?? 'this project'}.
          </p>
        </div>
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                {String(
                  query.data?.[key as keyof ProjectDetail] ?? 'Not recorded',
                )}
              </p>
            </div>
          ))}
        </section>
        <div className="flex justify-end">
          <Link
            to={`/projects/${projectId}/system_overview`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Edit in workspace
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
