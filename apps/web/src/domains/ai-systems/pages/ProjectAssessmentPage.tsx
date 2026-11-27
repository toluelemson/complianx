import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { HelpTooltip } from '@/shared/components/ui/help-tooltip';
import { RequirementMetadata } from '../components/RequirementMetadata';
import {
  createProjectAssessment,
  getAssessmentWorkspace,
  updateAssessmentScoring,
  type AssessmentWorkspace,
} from '../api';

type RowDraft = {
  obligationId: string;
  score: string;
  state: string;
  weight: string;
  rationale: string;
  evidenceLinks: string;
};

const rowStates = [
  ['NOT_STARTED', 'Not started'],
  ['IN_PROGRESS', 'In progress'],
  ['SATISFIED', 'Satisfied'],
  ['NOT_APPLICABLE', 'Not applicable'],
] as const;

function toRowDrafts(workspace: AssessmentWorkspace | null | undefined) {
  return Object.fromEntries(
    (workspace?.requirementRows ?? []).map((row) => [
      row.obligationId,
      {
        obligationId: row.obligationId,
        score: row.score === null ? '' : String(row.score),
        state: row.state,
        weight: String(row.weight),
        rationale: row.rationale ?? '',
        evidenceLinks: Array.isArray(row.evidenceLinks)
          ? row.evidenceLinks
              .filter((value): value is string => typeof value === 'string')
              .join('\n')
          : '',
      } satisfies RowDraft,
    ]),
  );
}

export default function ProjectAssessmentPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const client = useQueryClient();
  const workspace = useQuery({
    queryKey: ['assessmentWorkspace', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getAssessmentWorkspace(projectId),
  });
  const [weightingChoice, setWeightingChoice] = useState('STANDARD');
  const [targetBand, setTargetBand] = useState('READY');
  const [rows, setRows] = useState<Record<string, RowDraft>>({});

  useEffect(() => {
    if (!workspace.data) return;
    setWeightingChoice(workspace.data.weightingChoice);
    setTargetBand(workspace.data.targetBand);
    setRows(toRowDrafts(workspace.data));
  }, [workspace.data]);

  const create = useMutation({
    mutationFn: () => createProjectAssessment(projectId),
    onSuccess: () =>
      void client.invalidateQueries({
        queryKey: ['assessmentWorkspace', projectId],
      }),
  });
  const save = useMutation({
    mutationFn: () => {
      const current = workspace.data;
      if (!current) throw new Error('Create an assessment first.');
      return updateAssessmentScoring(projectId, current.id, {
        weightingChoice,
        targetBand,
        rows: current.requirementRows.map((row) => {
          const draft = rows[row.obligationId];
          return {
            obligationId: row.obligationId,
            score: draft?.score.trim() ? Number(draft.score) : null,
            state: draft?.state ?? row.state,
            weight: Number(draft?.weight ?? row.weight),
            rationale: draft?.rationale.trim() || null,
            evidenceLinks: (draft?.evidenceLinks ?? '')
              .split(/\n|,/)
              .map((link) => link.trim())
              .filter(Boolean),
          };
        }),
      });
    },
    onSuccess: () =>
      void client.invalidateQueries({
        queryKey: ['assessmentWorkspace', projectId],
      }),
  });
  const current = workspace.data;
  const statusLabel = useMemo(
    () => current?.status.replaceAll('_', ' ').toLowerCase() ?? '',
    [current?.status],
  );

  if (!initializing && !token) return <Navigate to="/login" replace />;
  return (
    <AppShell title="Compliance scoring" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Compliance scoring
          </h1>
          <span className="mt-2 inline-flex">
            <HelpTooltip label="About compliance scoring">
              Use this advanced audit tool to score applicable requirements and
              retain a versioned record of rationale and evidence links.
            </HelpTooltip>
          </span>
        </div>

        {workspace.isLoading ? (
          <p className="text-sm text-slate-500">Loading assessment…</p>
        ) : null}
        {workspace.isError ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            Unable to load the assessment. Please retry.
          </p>
        ) : null}
        {!workspace.isLoading && !current ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Start an assessment
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create the assessment, then complete Classification to generate
              its applicable requirement rows for scoring.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {create.isPending ? 'Creating…' : 'Create assessment'}
              </button>
              <Link
                to={`/projects/${projectId}/classification`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Go to Classification
              </Link>
            </div>
            {create.isError ? (
              <p role="alert" className="mt-3 text-sm text-red-700">
                The assessment could not be created. Please retry.
              </p>
            ) : null}
          </section>
        ) : null}

        {current ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ReadOnly
                  label="Catalogue version"
                  value={current.packVersion.version}
                />
                <ReadOnly label="Assessment status" value={statusLabel} />
                <ReadOnly
                  label="Version number"
                  value={`v${current.versionNumber}`}
                />
                <ReadOnly
                  label="Coverage score"
                  value={
                    current.coverageScore === null ||
                    current.coverageScore === undefined
                      ? 'Not scored'
                      : `${current.coverageScore}%`
                  }
                />
                <ReadOnly
                  label="Assessment method"
                  value={current.assessorType.replaceAll('_', ' ')}
                />
                <ReadOnly
                  label="Assessment date"
                  value={new Date(current.assessmentDate).toLocaleDateString()}
                />
                <label className="text-sm font-medium text-slate-700">
                  Weighting choice
                  <select
                    aria-label="Weighting choice"
                    disabled={current.status === 'FINALIZED'}
                    value={weightingChoice}
                    onChange={(event) => setWeightingChoice(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="EQUAL">Equal</option>
                    <option value="RISK_WEIGHTED">Risk weighted</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Target band
                  <select
                    aria-label="Target band"
                    disabled={current.status === 'FINALIZED'}
                    value={targetBand}
                    onChange={(event) => setTargetBand(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="READY">Ready</option>
                    <option value="NEEDS_ATTENTION">Needs attention</option>
                    <option value="AT_RISK">At risk</option>
                  </select>
                </label>
              </div>
              <Link
                to={`/projects/${projectId}/traceability`}
                className="mt-4 inline-flex text-sm font-semibold text-sky-700"
              >
                Edit assessor and traceability →
              </Link>
            </section>

            {current.status === 'FINALIZED' ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                This assessment version is finalized and read-only. Its scores,
                rationale, evidence links, and change history are preserved.
              </section>
            ) : null}

            {!current.requirementRows.length ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                No applicable requirement rows yet. Complete{' '}
                <Link
                  className="font-semibold underline"
                  to={`/projects/${projectId}/classification`}
                >
                  Classification
                </Link>{' '}
                to generate them.
              </section>
            ) : null}
            {current.requirementRows.map((row) => {
              const draft = rows[row.obligationId];
              const setDraft = (patch: Partial<RowDraft>) =>
                setRows((previous) => ({
                  ...previous,
                  [row.obligationId]: {
                    ...previous[row.obligationId],
                    ...patch,
                    obligationId: row.obligationId,
                  },
                }));
              return (
                <section
                  key={row.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h2 className="font-semibold text-slate-900">
                    {row.obligation.obligation.title}
                  </h2>
                  <RequirementMetadata
                    requirement={{
                      ...row.obligation.obligation,
                      catalogueId: row.requirementId,
                    }}
                    className="mt-1"
                  />
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="text-sm font-medium text-slate-700">
                      Score (0–100)
                      <input
                        aria-label={`Score for ${row.obligation.obligation.title}`}
                        disabled={current.status === 'FINALIZED'}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={draft?.score ?? ''}
                        onChange={(event) =>
                          setDraft({ score: event.target.value })
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      State
                      <select
                        aria-label={`State for ${row.obligation.obligation.title}`}
                        disabled={current.status === 'FINALIZED'}
                        value={draft?.state ?? row.state}
                        onChange={(event) =>
                          setDraft({ state: event.target.value })
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        {rowStates.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Weight
                      <input
                        aria-label={`Weight for ${row.obligation.obligation.title}`}
                        disabled={current.status === 'FINALIZED'}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={draft?.weight ?? String(row.weight)}
                        onChange={(event) =>
                          setDraft({ weight: event.target.value })
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Rationale
                    <textarea
                      aria-label={`Rationale for ${row.obligation.obligation.title}`}
                      disabled={current.status === 'FINALIZED'}
                      value={draft?.rationale ?? ''}
                      onChange={(event) =>
                        setDraft({ rationale: event.target.value })
                      }
                      rows={3}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Evidence links
                    <span className="ml-1 font-normal text-slate-500">
                      (one HTTP(S) URL per line)
                    </span>
                    <textarea
                      aria-label={`Evidence links for ${row.obligation.obligation.title}`}
                      disabled={current.status === 'FINALIZED'}
                      value={draft?.evidenceLinks ?? ''}
                      onChange={(event) =>
                        setDraft({ evidenceLinks: event.target.value })
                      }
                      rows={3}
                      placeholder="https://…"
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </section>
              );
            })}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (current.status !== 'FINALIZED') save.mutate();
                }}
                disabled={
                  save.isPending ||
                  !current.requirementRows.length ||
                  current.status === 'FINALIZED'
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {save.isPending ? 'Saving…' : 'Save scoring'}
              </button>
              {save.isSuccess ? (
                <span className="text-sm text-emerald-700">
                  Saved as version {current.versionNumber + 1}.
                </span>
              ) : null}
              {save.isError ? (
                <span role="alert" className="text-sm text-red-700">
                  Could not save. Scores must be 0–100 and evidence links must
                  be valid HTTPS URLs.
                </span>
              ) : null}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Change history
              </h2>
              <ol className="mt-4 space-y-3">
                {current.changeLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-slate-200 pl-3 text-sm"
                  >
                    <p className="font-medium text-slate-800">
                      v{entry.versionNumber} ·{' '}
                      {entry.action.replaceAll('_', ' ').toLowerCase()}
                    </p>
                    <p className="text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
              {!current.changeLog.length ? (
                <p className="mt-3 text-sm text-slate-500">
                  No changes recorded yet.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
        {value}
      </p>
    </div>
  );
}
