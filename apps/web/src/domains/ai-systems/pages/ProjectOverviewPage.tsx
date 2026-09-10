import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type {
  ProjectDetail,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import {
  getProject,
  getProjectDocuments,
  getProjectSections,
  getPreliminaryClassification,
  listAssessmentAnswers,
  saveAssessmentAnswers,
} from '../api';

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
  const classificationQuery = useQuery({
    queryKey: ['preliminaryClassification', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getPreliminaryClassification(projectId),
  });
  const answersQuery = useQuery({
    queryKey: [
      'assessmentAnswers',
      projectId,
      classificationQuery.data?.assessmentId,
    ],
    enabled: Boolean(classificationQuery.data?.assessmentId),
    queryFn: () =>
      listAssessmentAnswers(
        projectId,
        classificationQuery.data?.assessmentId ?? '',
      ),
  });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (answersQuery.data)
      setAnswers(
        Object.fromEntries(
          answersQuery.data.map((answer) => [
            answer.questionKey,
            answer.valueJson,
          ]),
        ),
      );
  }, [answersQuery.data]);
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
        {classificationQuery.data?.assessmentId ? (
          <Questionnaire
            projectId={projectId}
            assessmentId={classificationQuery.data.assessmentId}
            answers={answers}
            setAnswers={setAnswers}
          />
        ) : null}
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

function Questionnaire({
  projectId,
  assessmentId,
  answers,
  setAnswers,
}: {
  projectId: string;
  assessmentId: string;
  answers: Record<string, unknown>;
  setAnswers: (value: Record<string, unknown>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await saveAssessmentAnswers(projectId, assessmentId, answers);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Classification questionnaire
          </h2>
          <p className="text-sm text-slate-500">
            Saved answers include author and timestamp.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save answers'}
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={answers.uses_sensitive_data === true}
            onChange={(event) =>
              setAnswers({
                ...answers,
                uses_sensitive_data: event.target.checked,
              })
            }
          />
          Uses sensitive or personal data
        </label>
        <label className="flex gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={answers.human_oversight_required === true}
            onChange={(event) =>
              setAnswers({
                ...answers,
                human_oversight_required: event.target.checked,
              })
            }
          />
          Requires human oversight
        </label>
        {answers.uses_sensitive_data === true ? (
          <label className="text-sm text-slate-700 sm:col-span-2">
            Sensitive data categories
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              value={String(answers.sensitive_data_types ?? '')}
              onChange={(event) =>
                setAnswers({
                  ...answers,
                  sensitive_data_types: event.target.value,
                })
              }
            />
          </label>
        ) : null}
      </div>
    </section>
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
