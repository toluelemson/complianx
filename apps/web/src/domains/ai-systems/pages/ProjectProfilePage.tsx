import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectDetail } from '@complianx/contracts/ai-systems';
import {
  getOrganizationProfile,
  getProject,
  updateOrganizationProfile,
  updateProject,
} from '../api';

const organizationFields = [
  ['legalName', 'Legal name'],
  ['website', 'Website'],
  ['industry', 'Industry'],
  ['address', 'Address'],
  ['contactEmail', 'Contact email'],
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

export default function ProjectProfilePage({
  organization: organizationProp = false,
}: {
  organization?: boolean;
}) {
  const { projectId = '', profileKey = 'ai-system-profile' } = useParams<{
    projectId: string;
    profileKey: string;
  }>();
  const organization =
    organizationProp || profileKey === 'organization-profile';
  const { token, initializing, activeCompanyId } = useAuth();
  const query = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const organizationQuery = useQuery({
    queryKey: ['company', activeCompanyId],
    enabled: Boolean(token && activeCompanyId && organization),
    queryFn: getOrganizationProfile,
  });
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      organization
        ? updateOrganizationProfile(payload)
        : updateProject(projectId, {
            name: query.data?.name ?? '',
            ...payload,
          }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['project', projectId] });
      void client.invalidateQueries({ queryKey: ['company', activeCompanyId] });
    },
  });
  if (!initializing && !token) return <Navigate to="/login" replace />;
  const fields = organization ? organizationFields : systemFields;
  const profile = organization ? organizationQuery.data : query.data;
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
            {organization
              ? 'Shared organization details reused across projects.'
              : `System details for ${query.data?.name ?? 'this project'}.`}
          </p>
        </div>
        <form
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const values = Object.fromEntries(
              Array.from(new FormData(event.currentTarget).entries()).map(
                ([key, value]) => [key, String(value)],
              ),
            );
            save.mutate(
              organization
                ? values
                : { name: query.data?.name ?? '', ...values },
            );
          }}
        >
          {fields.map(([key, label]) => (
            <label key={key} className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {label}
              </p>
              {key === 'lifecycleStage' ? (
                <select
                  name={key}
                  defaultValue={String(
                    profile?.[key as keyof typeof profile] ?? 'UNKNOWN',
                  )}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="UNKNOWN">Not set</option>
                  <option value="DESIGN">Design</option>
                  <option value="DEVELOPMENT">Development</option>
                  <option value="PILOT">Pilot</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="RETIRED">Retired</option>
                </select>
              ) : (
                <textarea
                  name={key}
                  defaultValue={String(
                    profile?.[key as keyof typeof profile] ?? '',
                  )}
                  rows={key === 'description' || key === 'intendedUse' ? 3 : 2}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              )}
            </label>
          ))}
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={
                save.isPending ||
                (!organization && !query.data) ||
                (organization && !organizationQuery.data)
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
