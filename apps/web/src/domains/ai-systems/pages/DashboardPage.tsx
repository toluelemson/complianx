// AI systems domain route.
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import type { NewProjectFormValues } from '../components/NewProjectModal';
import { NewProjectModal } from '../components/NewProjectModal';
import { CloneProjectModal } from '../components/CloneProjectModal';
import {
  cloneProject,
  createProject,
  listProjects,
} from '@/domains/ai-systems/api';
import type { ProjectListItem } from '@complianx/contracts/ai-systems';
import { TRACKABLE_STEP_COUNT } from '@/domains/ai-systems/constants/steps';
import { DOCUMENT_LABELS } from '@/domains/ai-systems/constants/documents';
import { useAuth } from '@/app/providers/AuthContext';

export default function DashboardPage() {
  const { token, initializing, activeCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const workspaceSuffix = activeCompanyId
    ? `?companyId=${activeCompanyId}`
    : '';
  const [isModalOpen, setModalOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const projectsQuery = useQuery<ProjectListItem[]>({
    queryKey: ['projects', activeCompanyId],
    enabled: Boolean(token && activeCompanyId),
    queryFn: listProjects,
  });

  const createMutation = useMutation({
    mutationFn: (values: NewProjectFormValues) => createProject(values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', activeCompanyId],
      });
      setModalOpen(false);
      toast.success('Project created');
    },
    onError: () => {
      toast.error('Unable to create project');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (payload: { projectId: string; name: string }) =>
      cloneProject(payload.projectId, payload.name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects', activeCompanyId],
      });
      setCloneTarget(null);
      toast.success('Project duplicated');
    },
    onError: () => {
      toast.error('Unable to duplicate project');
    },
  });
  const projects = projectsQuery.data ?? [];
  const ownedProjects = projects.filter(
    (project) => !project.viewerRole || project.viewerRole === 'OWNER',
  );
  const assignedProjects = projects.filter(
    (project) => project.viewerRole && project.viewerRole !== 'OWNER',
  );
  const readinessBadgeClass = (value: number) =>
    value >= 80
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : value >= 40
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-rose-50 text-rose-700 border border-rose-200';
  const { readinessByProject, averageReadiness, recentDocuments } =
    useMemo(() => {
      const readinessMap = new Map<string, number>();
      let readinessTotal = 0;
      const docs: Array<{
        id: string;
        type: string;
        createdAt: string;
        projectName: string;
      }> = [];

      ownedProjects.forEach((project) => {
        const uniqueSections = new Set(
          (project.sections ?? []).map((section) => section.name),
        );
        const readiness = Math.round(
          (uniqueSections.size / TRACKABLE_STEP_COUNT) * 100 || 0,
        );
        readinessMap.set(project.id, readiness);
        readinessTotal += readiness;
        (project.documents ?? []).forEach((doc) => {
          docs.push({
            id: doc.id,
            type: doc.type,
            createdAt: doc.createdAt,
            projectName: project.name,
          });
        });
      });

      docs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return {
        readinessByProject: readinessMap,
        averageReadiness: readinessMap.size
          ? Math.round(readinessTotal / readinessMap.size)
          : 0,
        recentDocuments: docs.slice(0, 4),
      };
    }, [ownedProjects]);

  if (!initializing && !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell title="Your AI Systems">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            Track each AI system and its compliance documentation in one place.
          </p>
          <p className="text-xs text-slate-400">
            Use the quick actions to jump into the work you handle most often.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            New AI System
          </button>
          <Link
            to="/company"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage organization
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/92 p-4 text-left text-sm font-semibold text-slate-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] transition hover:border-slate-300 hover:text-slate-900"
        >
          + Create a new AI system
          <p className="mt-1 text-xs font-normal text-slate-500">
            Launch the guided wizard to capture high-level project details.
          </p>
        </button>
        <Link
          to="/company"
          className="rounded-[1.5rem] border border-slate-200 bg-white/92 p-4 text-sm font-semibold text-slate-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] transition hover:border-slate-300 hover:text-slate-900"
        >
          Review team access
          <p className="mt-1 text-xs font-normal text-slate-500">
            Invite reviewers or adjust member permissions.
          </p>
        </Link>
        <Link
          to="/demo/eu-ai-act-report"
          className="rounded-[1.5rem] border border-slate-200 bg-white/92 p-4 text-sm font-semibold text-slate-700 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] transition hover:border-slate-300 hover:text-slate-900"
        >
          Open demo tool
          <p className="mt-1 text-xs font-normal text-slate-500">
            Launch the editable EU AI Act report demo for live calls.
          </p>
        </Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-6 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)]">
          <p className="text-sm font-semibold text-slate-700">
            Portfolio readiness
          </p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">
            {averageReadiness}%
          </p>
          <p className="text-sm text-slate-500">
            Average completion across {ownedProjects.length || '0'} AI systems
          </p>
          <div className="mt-4 h-3 w-full rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${averageReadiness}%` }}
            />
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-6 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Recent activity
            </p>
            <span className="text-xs text-slate-400">
              Last {recentDocuments.length || 0} docs
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {recentDocuments.length ? (
              recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {DOCUMENT_LABELS[doc.type] ?? doc.type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {doc.projectName} ·{' '}
                      {new Date(doc.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Generate documentation to see activity history.
              </p>
            )}
          </div>
        </div>
      </div>
      {assignedProjects.length ? (
        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white/92 p-6 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Assigned reviews
            </p>
            <span className="text-xs text-slate-400">
              {assignedProjects.length} active
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {assignedProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}${workspaceSuffix}`}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 hover:border-sky-200"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {project.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Role: {project.viewerRole?.toLowerCase() ?? 'reviewer'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {(
                    project.workflowStatus ??
                    project.status ??
                    'IN_REVIEW'
                  ).replaceAll('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-8 hidden overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/92 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Industry</th>
                <th className="px-6 py-3 font-medium">Risk Level</th>
                <th className="px-6 py-3 font-medium">Readiness</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ownedProjects.length ? (
                ownedProjects.map((project) => {
                  const readiness = readinessByProject.get(project.id) ?? 0;
                  const readinessBadge = readinessBadgeClass(readiness);
                  return (
                    <tr key={project.id} className="border-b border-slate-100">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {project.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {project.industry ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {project.riskLevel ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${readinessBadge}`}
                        >
                          {readiness}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() =>
                              setCloneTarget({
                                id: project.id,
                                name: project.name,
                              })
                            }
                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            Duplicate
                          </button>
                          <Link
                            to={`/projects/${project.id}/trust${workspaceSuffix}`}
                            className="text-sm font-medium text-slate-500 hover:text-sky-600"
                          >
                            Trust →
                          </Link>
                          <Link
                            to={`/projects/${project.id}${workspaceSuffix}`}
                            className="text-sm font-medium text-sky-600 hover:text-sky-500"
                          >
                            Open →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    {projectsQuery.isLoading
                      ? 'Loading projects...'
                      : 'No projects yet. Create one to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 space-y-4 md:hidden">
        {ownedProjects.length ? (
          ownedProjects.map((project) => {
            const readiness = readinessByProject.get(project.id) ?? 0;
            const readinessBadge = readinessBadgeClass(readiness);
            return (
              <div
                key={project.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white/92 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {project.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {project.industry ?? '—'} · {project.riskLevel ?? '—'}{' '}
                      risk
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${readinessBadge}`}
                  >
                    {readiness}%
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-600">Created:</span>
                  <span>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      setCloneTarget({
                        id: project.id,
                        name: project.name,
                      })
                    }
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Duplicate
                  </button>
                  <Link
                    to={`/projects/${project.id}/trust${workspaceSuffix}`}
                    className="text-sm font-medium text-slate-500 hover:text-sky-600"
                  >
                    Trust →
                  </Link>
                  <Link
                    to={`/projects/${project.id}${workspaceSuffix}`}
                    className="text-sm font-medium text-sky-600 hover:text-sky-500"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/92 p-6 text-center text-sm text-slate-500 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]">
            {projectsQuery.isLoading
              ? 'Loading projects...'
              : 'No projects yet. Create one to get started.'}
          </div>
        )}
      </div>
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => createMutation.mutate(values)}
        isSubmitting={createMutation.isPending}
      />
      <CloneProjectModal
        isOpen={Boolean(cloneTarget)}
        projectName={cloneTarget?.name ?? ''}
        defaultName={
          cloneTarget ? `${cloneTarget.name} Template` : 'New AI System'
        }
        isSubmitting={cloneMutation.isPending}
        onClose={() => setCloneTarget(null)}
        onSubmit={(name) => {
          if (cloneTarget) {
            cloneMutation.mutate({ projectId: cloneTarget.id, name });
          }
        }}
      />
    </AppShell>
  );
}
