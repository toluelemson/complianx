// AI systems domain route.
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import type { NewProjectFormValues } from '../components/NewProjectModal';
import { NewProjectModal } from '../components/NewProjectModal';
import { CloneProjectModal } from '../components/CloneProjectModal';
import {
  cloneProject,
  createProject,
  listProjects,
  getOrganizationProfile,
} from '@/domains/ai-systems/api';
import type { ProjectListItem } from '@complianx/contracts/ai-systems';
import { TRACKABLE_STEP_COUNT } from '@/domains/ai-systems/constants/steps';
import { DOCUMENT_LABELS } from '@/domains/ai-systems/constants/documents';
import { useAuth } from '@/app/providers/AuthContext';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import {
  getProjectAttentionReasons,
  getProjectNextAction,
  type ProjectNextAction,
} from '../lib/project-page-logic';

export default function DashboardPage() {
  const { token, initializing, activeCompanyId } = useAuth();
  const navigate = useNavigate();
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
  const organizationProfileQuery = useQuery({
    queryKey: ['organizationProfile', activeCompanyId],
    enabled: Boolean(token && activeCompanyId),
    queryFn: getOrganizationProfile,
  });

  const createMutation = useMutation({
    mutationFn: (values: NewProjectFormValues) => createProject(values),
    onSuccess: (project) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', activeCompanyId],
      });
      setModalOpen(false);
      toast.success('Project created');
      trackMarketingEvent('ai_system_registered');
      navigate(`/projects/${project.id}/classification`);
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
  const { readinessByProject, recentDocuments, attentionProjects } =
    useMemo(() => {
      const readinessMap = new Map<string, number>();
      const attention: Array<{
        project: ProjectListItem;
        reasons: string[];
        nextAction: ProjectNextAction;
      }> = [];
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
        const reasons = getProjectAttentionReasons(project);
        const nextAction = getProjectNextAction(project);
        if (reasons.length && nextAction) {
          attention.push({ project, reasons, nextAction });
        }
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
        recentDocuments: docs.slice(0, 4),
        attentionProjects: attention,
      };
    }, [ownedProjects]);

  if (!initializing && !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell title="Documentation workspace">
      <div className="hz-console-content hz-dashboard">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Intake to approval.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="hz-button hz-button--primary"
            >
              Assess an AI system
            </button>
            <Link to="/company" className="hz-button hz-button--outline">
              Settings
            </Link>
          </div>
        </div>
        <div className="hz-dashboard__metrics mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="hz-dashboard__metric-card border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">AI systems</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {ownedProjects.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Registered</p>
          </div>
          <div
            id="reviews"
            className="hz-dashboard__metric-card border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-700">
              Reviews waiting
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {assignedProjects.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Assigned</p>
          </div>
          <div
            id="documents"
            className="hz-dashboard__metric-card border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-700">
              Documents generated
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {ownedProjects.reduce(
                (count, project) => count + (project.documents?.length ?? 0),
                0,
              )}
            </p>
            <p className="mt-1 text-sm text-slate-500">All systems</p>
          </div>
          {recentDocuments.length ? (
            <div
              id="recent-activity"
              className="hz-dashboard__metric-card border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Recent package activity
                </p>
                <span className="text-xs text-slate-400">
                  {recentDocuments.length} recent records
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {recentDocuments.map((doc) => (
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
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {!projectsQuery.isLoading && ownedProjects.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/70 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-sky-900">
                  Your first 30 minutes
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Start with one system, then let the workspace guide you.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  You do not need every policy or document upfront. Start with
                  the system name and intended use; we will identify likely
                  requirements and the next evidence to collect.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="hz-button hz-button--primary"
              >
                Add your first AI system
              </button>
              <Link to="/demo/loan-approval-ai" className="hz-button hz-button--outline">
                Explore a fictional example
              </Link>
            </div>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ['1', 'Register', 'System name and intended use.'],
                ['2', 'Classify', 'Answer the essential EU AI Act questions.'],
                ['3', 'Act', 'Work through the highest-priority requirements.'],
              ].map(([number, title, description]) => (
                <li
                  key={number}
                  className="rounded-xl border border-sky-100 bg-white p-4"
                >
                  <span className="text-xs font-bold text-sky-700">
                    STEP {number}
                  </span>
                  <p className="mt-1 font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {attentionProjects.length ? (
          <section className="mt-6 rounded-2xl border border-amber-200 border-l-4 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Next actions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  What needs attention in your workspace.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {attentionProjects.length} system
                {attentionProjects.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-4 grid max-w-2xl gap-2">
              {attentionProjects.map(({ project, reasons, nextAction }) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}${nextAction.path === 'overview' ? '' : `/${nextAction.path}`}${workspaceSuffix}`}
                  className="rounded-xl border border-slate-200 p-3 hover:border-amber-400"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      {project.name}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-sky-700">
                      {nextAction.label} →
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{reasons[0]}</p>
                  {reasons.length > 1 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      +{reasons.length - 1} additional item
                      {reasons.length === 2 ? '' : 's'}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {assignedProjects.length ? (
          <div className="hz-dashboard__assigned mt-6 rounded-[1.75rem] border border-slate-200 bg-white/92 p-6 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                My work
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
                      Assigned as {project.viewerRole?.toLowerCase() ?? 'reviewer'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {(project.workflowStatus ?? 'IN_REVIEW').replaceAll(
                      '_',
                      ' ',
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <div
          id="systems"
          className="hz-dashboard__table mt-8 hidden overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/92 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.22)] md:block"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Industry</th>
                  <th className="px-6 py-3 font-medium">Classification</th>
                  <th className="px-6 py-3 font-medium">
                    Documentation progress
                  </th>
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
                      <tr
                        key={project.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {project.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {project.industry ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {project.riskLevel ? 'Preliminary' : 'Not classified'}
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
                              Assessment →
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
                        {project.industry ?? '—'} ·{' '}
                        {project.riskLevel
                          ? 'Preliminary classification'
                          : 'Not classified'}
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
                      Assessment →
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
          organizationProfile={organizationProfileQuery.data}
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
      </div>
    </AppShell>
  );
}
