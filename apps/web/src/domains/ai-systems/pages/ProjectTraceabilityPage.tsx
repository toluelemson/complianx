import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { HelpTooltip } from '@/shared/components/ui/help-tooltip';
import { RequirementMetadata } from '../components/RequirementMetadata';
import {
  createComplianceStakeholder,
  createDocumentationItem,
  createLifecycleEvent,
  createSystemAsset,
  createTechnicalMeasure,
  finalizeAssessment,
  getTraceabilityModel,
  updateAssessmentContext,
  updateRequirementAssetLinks,
  updateSystemAsset,
  updateTechnicalMeasure,
  type TraceabilityModel,
} from '../api';

const assetTypes = [
  ['MODEL', 'AI model'],
  ['DATASET', 'Dataset'],
  ['SOFTWARE_COMPONENT', 'Software'],
  ['INFRASTRUCTURE', 'Infrastructure'],
  ['USER_INTERFACE', 'User interface'],
  ['HUMAN_PROCESS', 'Human process'],
  ['OTHER', 'Other'],
] as const;

const documentTypes = [
  ['GENERAL_SYSTEM_DESCRIPTION', 'System description'],
  ['DETAILED_SYSTEM_ELEMENTS', 'Detailed elements'],
  ['DESIGN_AND_DEVELOPMENT_PROCEDURES', 'Design and development'],
  ['RISK_MANAGEMENT_DOCUMENTATION', 'Risk management'],
  ['DATA_GOVERNANCE_DOCUMENTATION', 'Data governance'],
  ['MONITORING_AND_TESTING', 'Monitoring and testing'],
  ['CHANGES_AND_UPDATES', 'Changes and updates'],
  ['STANDARDS_APPLIED', 'Standards applied'],
  ['EU_DECLARATION_OF_CONFORMITY', 'EU declaration'],
  ['INSTRUCTIONS_FOR_USE', 'Instructions for use'],
  ['OTHER', 'Other'],
] as const;

const assessorTypes = [
  ['SELF_ASSESSMENT', 'Self-assessment'],
  ['INTERNAL_AUDIT', 'Internal audit'],
  ['NOTIFIED_BODY', 'Notified body'],
  ['COMPETENT_AUTHORITY', 'Competent authority'],
] as const;

const measureStatuses = [
  ['PLANNED', 'Planned'],
  ['PARTIAL', 'Partial'],
  ['COMPLETE', 'Complete'],
] as const;

const lifecycleStages = [
  ['UNKNOWN', 'Unknown'],
  ['DESIGN', 'Design'],
  ['DEVELOPMENT', 'Development'],
  ['PILOT', 'Pilot'],
  ['PRODUCTION', 'Production'],
  ['RETIRED', 'Retired'],
] as const;

const stakeholderRoles = [
  ['PROVIDER', 'Provider'],
  ['DEPLOYER', 'Deployer'],
  ['IMPORTER', 'Importer'],
  ['DISTRIBUTOR', 'Distributor'],
  ['AUTHORIZED_REPRESENTATIVE', 'Authorized representative'],
  ['NOTIFIED_BODY', 'Notified body'],
  ['COMPETENT_AUTHORITY', 'Competent authority'],
  ['EU_AI_OFFICE', 'EU AI Office'],
] as const;

export default function ProjectTraceabilityPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const client = useQueryClient();
  const queryKey = ['traceability-model', projectId, activeCompanyId];
  const model = useQuery({
    queryKey,
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getTraceabilityModel(projectId),
  });
  const refresh = () => client.invalidateQueries({ queryKey });
  const assetCreate = useMutation({
    mutationFn: (payload: Parameters<typeof createSystemAsset>[1]) =>
      createSystemAsset(projectId, payload),
    onSuccess: refresh,
  });
  const assetUpdate = useMutation({
    mutationFn: ({
      assetId,
      lifecycleStage,
    }: {
      assetId: string;
      lifecycleStage: string;
    }) => updateSystemAsset(projectId, assetId, { lifecycleStage }),
    onSuccess: () => {
      void refresh();
    },
  });
  const documentCreate = useMutation({
    mutationFn: (payload: Parameters<typeof createDocumentationItem>[1]) =>
      createDocumentationItem(projectId, payload),
    onSuccess: refresh,
  });
  const assessorSave = useMutation({
    mutationFn: (payload: {
      assessmentId: string;
      assessorType: string;
      assessorName?: string;
      assessmentDate: string;
    }) => updateAssessmentContext(projectId, payload.assessmentId, payload),
    onSuccess: refresh,
  });
  const lifecycleCreate = useMutation({
    mutationFn: (payload: Parameters<typeof createLifecycleEvent>[1]) =>
      createLifecycleEvent(projectId, payload),
    onSuccess: refresh,
  });
  const stakeholderCreate = useMutation({
    mutationFn: (payload: Parameters<typeof createComplianceStakeholder>[1]) =>
      createComplianceStakeholder(projectId, payload),
    onSuccess: refresh,
  });
  const finalize = useMutation({
    mutationFn: (assessmentId: string) =>
      finalizeAssessment(projectId, assessmentId),
    onSuccess: refresh,
  });

  if (!initializing && !token) return <Navigate to="/login" replace />;

  return (
    <AppShell title="Compliance traceability" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <header>
          <Link
            to={`/projects/${projectId}/advanced`}
            className="text-sm text-slate-500 hover:text-sky-700"
          >
            ← Advanced tools
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Compliance traceability
          </h1>
          <HelpTooltip className="mt-2" label="About traceability">
            Connect system assets to permanent requirements, technical measures,
            documentation, evidence, and assessment coverage.
          </HelpTooltip>
        </header>

        {model.isLoading ? <p role="status">Loading traceability…</p> : null}
        {model.isError ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            Unable to load the traceability model.
          </p>
        ) : null}
        {model.data ? (
          <>
            <ScopeNotice model={model.data} />
            <AssessmentContext
              model={model.data}
              pending={assessorSave.isPending}
              finalizing={finalize.isPending}
              finalizeError={finalize.isError}
              onSave={(payload) => assessorSave.mutate(payload)}
              onFinalize={(assessmentId) => finalize.mutate(assessmentId)}
            />
            <ReassessmentNotice model={model.data} />
            <GapRecommendations model={model.data} />
            <StakeholderAndLifecycle
              model={model.data}
              stakeholderPending={stakeholderCreate.isPending}
              lifecyclePending={lifecycleCreate.isPending}
              onCreateStakeholder={(payload) =>
                stakeholderCreate.mutate(payload)
              }
              onCreateLifecycle={(payload) => lifecycleCreate.mutate(payload)}
            />
            <AssetStage
              model={model.data}
              pending={assetCreate.isPending}
              onCreate={(payload) => assetCreate.mutate(payload)}
              onUpdateLifecycle={(assetId, lifecycleStage) =>
                assetUpdate.mutate({ assetId, lifecycleStage })
              }
            />
            <RequirementStage
              projectId={projectId}
              model={model.data}
              onChanged={refresh}
            />
            <TraceabilityGraph model={model.data} />
            <DocumentationStage
              model={model.data}
              pending={documentCreate.isPending}
              onCreate={(payload) => documentCreate.mutate(payload)}
            />
            <VersionComparison model={model.data} />
            <HistoryPanel model={model.data} />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReassessmentNotice({ model }: { model: TraceabilityModel }) {
  if (!model.reassessment.required) return null;
  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
    >
      <p className="font-semibold">Human reassessment required</p>
      <p className="mt-1 text-sm">
        {model.reassessment.reason} Review the changed lifecycle context and
        supporting evidence before relying on the finalized assessment. This
        notice does not itself determine compliance.
      </p>
    </section>
  );
}

function ScopeNotice({ model }: { model: TraceabilityModel }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm md:grid-cols-2">
      <div>
        <p className="font-semibold text-sky-950">Included</p>
        <p className="mt-1 text-sky-900">{model.scope.included}</p>
      </div>
      <div>
        <p className="font-semibold text-sky-950">Outside this model</p>
        <p className="mt-1 text-sky-900">{model.scope.excluded}</p>
      </div>
    </section>
  );
}

function AssessmentContext({
  model,
  pending,
  finalizing,
  finalizeError,
  onSave,
  onFinalize,
}: {
  model: TraceabilityModel;
  pending: boolean;
  finalizing: boolean;
  finalizeError: boolean;
  onSave: (payload: {
    assessmentId: string;
    assessorType: string;
    assessorName?: string;
    assessmentDate: string;
  }) => void;
  onFinalize: (assessmentId: string) => void;
}) {
  const assessment = model.assessment;
  const [type, setType] = useState(
    assessment?.assessorType ?? 'SELF_ASSESSMENT',
  );
  if (!assessment) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Assessment not started</h2>
        <p className="mt-1 text-sm text-amber-900">
          Create an assessment before recording assessor and coverage details.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Assessment
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Coverage and assessor
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Catalogue {assessment.catalogueVersion} · version{' '}
            {assessment.versionNumber} ·{' '}
            <span className="font-semibold text-slate-700">
              {assessment.status.replaceAll('_', ' ').toLowerCase()}
            </span>
          </p>
        </div>
        <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
          <p className="text-xs uppercase tracking-wide text-slate-300">
            Coverage score
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {assessment.coverageScore === null ||
            assessment.coverageScore === undefined
              ? 'Not scored'
              : `${assessment.coverageScore}%`}
          </p>
        </div>
      </div>
      <div
        className={`mt-5 rounded-xl border p-4 text-sm ${
          model.finalization.ready
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-950'
        }`}
      >
        <p className="font-semibold">
          {assessment.status === 'FINALIZED'
            ? 'Assessment finalized'
            : model.finalization.ready
              ? 'Ready for human finalization'
              : `${model.finalization.blockers.length} blocker(s) before finalization`}
        </p>
        {assessment.status !== 'FINALIZED' ? (
          <button
            type="button"
            onClick={() => onFinalize(assessment.id)}
            disabled={!model.finalization.ready || finalizing}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {finalizing ? 'Finalizing…' : 'Finalize assessment'}
          </button>
        ) : null}
        {finalizeError ? (
          <p role="alert" className="mt-2 text-red-700">
            Finalization failed. Reload the gap recommendations and resolve any
            remaining blockers.
          </p>
        ) : null}
      </div>
      {assessment.status !== 'FINALIZED' ? (
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSave({
              assessmentId: assessment.id,
              assessorType: type,
              assessorName: String(data.get('assessorName') ?? ''),
              assessmentDate: new Date(
                String(data.get('assessmentDate')),
              ).toISOString(),
            });
          }}
        >
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium text-slate-700">
              Assessment method
            </legend>
            <Pills options={assessorTypes} value={type} onChange={setType} />
          </fieldset>
          <label className="text-sm font-medium text-slate-700">
            Assessor or organization
            <input
              name="assessorName"
              defaultValue={assessment.assessorName}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Assessment date
            <input
              required
              name="assessmentDate"
              type="date"
              defaultValue={assessment.date.slice(0, 10)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"
          >
            {pending ? 'Saving…' : 'Save assessor details'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          This version is read-only. Its scoring, assessor context, and
          traceability history are preserved.
        </p>
      )}
    </section>
  );
}

function GapRecommendations({ model }: { model: TraceabilityModel }) {
  const blockers = model.gaps.filter((gap) => gap.severity === 'BLOCKER');
  const warnings = model.gaps.filter((gap) => gap.severity === 'WARNING');
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Automated review
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Gap recommendations
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            These checks identify missing traceability records. They support,
            but do not replace, human legal and conformity review.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
            {blockers.length} blockers
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            {warnings.length} warnings
          </span>
        </div>
      </div>
      {model.gaps.length ? (
        <ol className="mt-4 grid gap-3 lg:grid-cols-2">
          {model.gaps.map((gap) => (
            <li
              key={gap.id}
              className={`rounded-xl border p-4 ${
                gap.severity === 'BLOCKER'
                  ? 'border-red-200 bg-red-50'
                  : gap.severity === 'WARNING'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-sky-200 bg-sky-50'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {gap.severity} · {gap.category}
              </p>
              <p className="mt-1 font-semibold text-slate-900">{gap.title}</p>
              <p className="mt-1 text-sm text-slate-700">
                {gap.recommendation}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          No automated traceability gaps detected. Human confirmation is still
          required before relying on the assessment.
        </p>
      )}
    </section>
  );
}

function StakeholderAndLifecycle({
  model,
  stakeholderPending,
  lifecyclePending,
  onCreateStakeholder,
  onCreateLifecycle,
}: {
  model: TraceabilityModel;
  stakeholderPending: boolean;
  lifecyclePending: boolean;
  onCreateStakeholder: (
    payload: Parameters<typeof createComplianceStakeholder>[1],
  ) => void;
  onCreateLifecycle: (
    payload: Parameters<typeof createLifecycleEvent>[1],
  ) => void;
}) {
  const [role, setRole] = useState('PROVIDER');
  const [stage, setStage] = useState('DESIGN');
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
        Foundation
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        Accountable parties and lifecycle
      </h2>
      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="font-semibold text-slate-900">Stakeholder records</h3>
          <div className="mt-3 space-y-2">
            {model.stakeholders.map((stakeholder) => (
              <article
                key={stakeholder.id}
                className="rounded-xl bg-slate-50 p-3 text-sm"
              >
                <p className="font-semibold text-slate-900">
                  {stakeholder.name}
                </p>
                <p className="text-slate-600">
                  {stakeholder.role.replaceAll('_', ' ')}
                  {stakeholder.country ? ` · ${stakeholder.country}` : ''}
                  {stakeholder.registrationNumber
                    ? ` · ${stakeholder.registrationNumber}`
                    : ''}
                </p>
              </article>
            ))}
            {!model.stakeholders.length ? (
              <p className="text-sm text-slate-500">
                No accountable party recorded yet.
              </p>
            ) : null}
          </div>
          <form
            className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              onCreateStakeholder({
                role,
                name: String(data.get('name')),
                registrationNumber: String(
                  data.get('registrationNumber') ?? '',
                ),
                country: String(data.get('country') ?? ''),
                contactEmail: String(data.get('contactEmail') ?? ''),
                notes: String(data.get('notes') ?? ''),
              });
              form.reset();
            }}
          >
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                EU AI Act role
              </legend>
              <Pills
                options={stakeholderRoles}
                value={role}
                onChange={setRole}
                compact
              />
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Organization or authority
                <input
                  required
                  name="name"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Registration number
                <input
                  name="registrationNumber"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Country code
                <input
                  name="country"
                  maxLength={2}
                  placeholder="EE"
                  pattern="[A-Za-z]{2}"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Contact email
                <input
                  name="contactEmail"
                  type="email"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                name="notes"
                rows={2}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={stakeholderPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {stakeholderPending ? 'Adding…' : 'Add stakeholder'}
            </button>
          </form>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Lifecycle history</h3>
          <ol className="mt-3 space-y-2">
            {model.lifecycleEvents.map((event) => (
              <li
                key={event.id}
                className="border-l-2 border-sky-300 py-1 pl-3 text-sm"
              >
                <p className="font-semibold text-slate-900">
                  {event.stage.replaceAll('_', ' ')}
                </p>
                <p className="text-slate-500">
                  {new Date(event.happenedAt).toLocaleDateString()} ·{' '}
                  {event.createdBy.email}
                </p>
                {event.notes ? (
                  <p className="mt-1 text-slate-600">{event.notes}</p>
                ) : null}
              </li>
            ))}
            {!model.lifecycleEvents.length ? (
              <li className="text-sm text-slate-500">
                No lifecycle event recorded yet.
              </li>
            ) : null}
          </ol>
          <form
            className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              onCreateLifecycle({
                stage,
                happenedAt: new Date(
                  String(data.get('happenedAt')),
                ).toISOString(),
                notes: String(data.get('notes') ?? ''),
              });
              form.reset();
            }}
          >
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                Lifecycle stage
              </legend>
              <Pills
                options={lifecycleStages}
                value={stage}
                onChange={setStage}
                compact
              />
            </fieldset>
            <label className="block text-sm font-medium text-slate-700">
              Effective date
              <input
                required
                name="happenedAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Change notes
              <textarea
                name="notes"
                rows={2}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={lifecyclePending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {lifecyclePending ? 'Recording…' : 'Record lifecycle event'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function AssetStage({
  model,
  pending,
  onCreate,
  onUpdateLifecycle,
}: {
  model: TraceabilityModel;
  pending: boolean;
  onCreate: (payload: Parameters<typeof createSystemAsset>[1]) => void;
  onUpdateLifecycle: (assetId: string, lifecycleStage: string) => void;
}) {
  const [type, setType] = useState('MODEL');
  const [lifecycleStage, setLifecycleStage] = useState('DESIGN');
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
        Stage 1
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        Describe system assets
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Record the models, datasets, interfaces, infrastructure, and human
        processes that make up the AI system.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {model.assets.map((asset) => (
          <article key={asset.id} className="rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{asset.name}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              {asset.assetType.replaceAll('_', ' ')}
              {asset.version ? ` · ${asset.version}` : ''}
              {asset.lifecycleStage
                ? ` · ${asset.lifecycleStage.replaceAll('_', ' ')}`
                : ''}
            </p>
            {asset.description ? (
              <p className="mt-2 text-sm text-slate-600">{asset.description}</p>
            ) : null}
            <fieldset className="mt-3 border-t border-slate-200 pt-3">
              <legend className="text-xs font-semibold text-slate-700">
                Lifecycle stage for {asset.name}
              </legend>
              <Pills
                options={lifecycleStages}
                value={asset.lifecycleStage ?? 'UNKNOWN'}
                onChange={(stage) => onUpdateLifecycle(asset.id, stage)}
                compact
              />
            </fieldset>
          </article>
        ))}
      </div>
      {!model.assets.length ? (
        <p className="mt-4 text-sm text-slate-500">
          No system assets recorded yet.
        </p>
      ) : null}
      <form
        className="mt-5 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          onCreate({
            name: String(data.get('name')),
            version: String(data.get('version') ?? ''),
            description: String(data.get('description') ?? ''),
            assetType: type,
            lifecycleStage,
          });
          form.reset();
        }}
      >
        <label className="text-sm font-medium text-slate-700">
          Asset name
          <input
            required
            name="name"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Version
          <input
            name="version"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium text-slate-700">
            Asset type
          </legend>
          <Pills options={assetTypes} value={type} onChange={setType} />
        </fieldset>
        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium text-slate-700">
            Current lifecycle stage
          </legend>
          <Pills
            options={lifecycleStages}
            value={lifecycleStage}
            onChange={setLifecycleStage}
          />
        </fieldset>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            name="description"
            rows={2}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"
        >
          {pending ? 'Adding…' : 'Add system asset'}
        </button>
      </form>
    </section>
  );
}

function RequirementStage({
  projectId,
  model,
  onChanged,
}: {
  projectId: string;
  model: TraceabilityModel;
  onChanged: () => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Stage 2
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          Link requirements and measures
        </h2>
      </div>
      {model.obligations.map((obligation) => (
        <RequirementCard
          key={obligation.id}
          projectId={projectId}
          model={model}
          obligation={obligation}
          onChanged={onChanged}
        />
      ))}
      {!model.obligations.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Complete Classification to generate applicable requirements.
        </div>
      ) : null}
    </section>
  );
}

function RequirementCard({
  projectId,
  model,
  obligation,
  onChanged,
}: {
  projectId: string;
  model: TraceabilityModel;
  obligation: TraceabilityModel['obligations'][number];
  onChanged: () => void;
}) {
  const [selectedAssets, setSelectedAssets] = useState(
    obligation.assetLinks.map((link) => link.systemAsset.id),
  );
  const [status, setStatus] = useState<'PLANNED' | 'PARTIAL' | 'COMPLETE'>(
    'PLANNED',
  );
  const mapping = useMutation({
    mutationFn: () =>
      updateRequirementAssetLinks(projectId, obligation.id, selectedAssets),
    onSuccess: onChanged,
  });
  const measure = useMutation({
    mutationFn: (payload: Parameters<typeof createTechnicalMeasure>[2]) =>
      createTechnicalMeasure(projectId, obligation.id, payload),
    onSuccess: onChanged,
  });
  const measureStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: typeof status }) =>
      updateTechnicalMeasure(projectId, id, { status: next }),
    onSuccess: onChanged,
  });
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">
        {obligation.obligation.title}
      </h3>
      <RequirementMetadata
        className="mt-1"
        requirement={obligation.obligation}
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Applies to these assets
          </p>
          <div className="mt-2 space-y-2">
            {model.assets.map((asset) => (
              <label key={asset.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(asset.id)}
                  onChange={(event) =>
                    setSelectedAssets((current) =>
                      event.target.checked
                        ? [...current, asset.id]
                        : current.filter((id) => id !== asset.id),
                    )
                  }
                />
                {asset.name}
              </label>
            ))}
          </div>
          {!model.assets.length ? (
            <p className="mt-2 text-sm text-slate-500">
              Add a system asset in Stage 1 first.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => mapping.mutate()}
              disabled={mapping.isPending}
              className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {mapping.isPending ? 'Saving…' : 'Save asset links'}
            </button>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Technical measures
          </p>
          <div className="mt-2 space-y-2">
            {obligation.technicalMeasures.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">
                  {item.title}
                </p>
                <Pills
                  options={measureStatuses}
                  value={item.status}
                  onChange={(next) =>
                    measureStatus.mutate({ id: item.id, next })
                  }
                  compact
                />
              </div>
            ))}
          </div>
          <form
            className="mt-3 rounded-xl border border-slate-200 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              measure.mutate({
                title: String(data.get('title')),
                description: String(data.get('description') ?? ''),
                verificationNotes: String(data.get('verificationNotes') ?? ''),
                status,
              });
              form.reset();
            }}
          >
            <input
              required
              name="title"
              aria-label={`Technical measure for ${obligation.obligation.title}`}
              placeholder="Technical measure"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              aria-label={`Measure description for ${obligation.obligation.title}`}
              placeholder="How it implements the requirement"
              rows={2}
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Pills
              options={measureStatuses}
              value={status}
              onChange={setStatus}
              compact
            />
            <textarea
              name="verificationNotes"
              aria-label={`Verification notes for ${obligation.obligation.title}`}
              placeholder="Verification notes"
              rows={2}
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={measure.isPending}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add measure
            </button>
          </form>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {obligation.evidence.length} linked evidence item(s) ·{' '}
        {obligation.documentationItems.length} documentation record(s)
      </p>
    </article>
  );
}

function TraceabilityGraph({ model }: { model: TraceabilityModel }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
        Relationship graph
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        Assets → requirements → controls → evidence → assessment
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Each row shows the complete traceability path for one applicable
        requirement.
      </p>
      <div
        className="mt-4 space-y-3 overflow-x-auto pb-2"
        aria-label="Compliance relationship graph"
      >
        {model.obligations.map((item) => {
          const nodes = [
            {
              type: 'System asset',
              value:
                item.assetLinks
                  .map((link) => link.systemAsset.name)
                  .join(', ') || 'Missing asset link',
              missing: !item.assetLinks.length,
            },
            {
              type: 'Requirement',
              value: item.obligation.catalogueId,
              missing: false,
            },
            {
              type: 'Technical measure',
              value:
                item.technicalMeasures
                  .map((measure) => measure.title)
                  .join(', ') || 'Missing measure',
              missing: !item.technicalMeasures.length,
            },
            {
              type: 'Documentation / evidence',
              value: `${item.documentationItems.length} document(s), ${item.evidence.length} evidence link(s)`,
              missing: !item.documentationItems.length && !item.evidence.length,
            },
            {
              type: 'Assessment',
              value:
                model.assessment?.coverageScore === null ||
                model.assessment?.coverageScore === undefined
                  ? 'Not scored'
                  : `${model.assessment.coverageScore}% coverage`,
              missing:
                model.assessment?.coverageScore === null ||
                model.assessment?.coverageScore === undefined,
            },
          ];
          return (
            <div
              key={item.id}
              className="grid min-w-[1050px] grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-2"
            >
              {nodes.map((node, index) => (
                <div key={`${item.id}-${node.type}`} className="contents">
                  <div
                    className={`rounded-xl border p-3 ${
                      node.missing
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {node.type}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {node.value}
                    </p>
                  </div>
                  {index < nodes.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="self-center text-xl text-sky-500"
                    >
                      →
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {!model.obligations.length ? (
        <p className="mt-4 text-sm text-slate-500">
          The graph will appear after applicable requirements are generated.
        </p>
      ) : null}
    </section>
  );
}

function DocumentationStage({
  model,
  pending,
  onCreate,
}: {
  model: TraceabilityModel;
  pending: boolean;
  onCreate: (payload: Parameters<typeof createDocumentationItem>[1]) => void;
}) {
  const [type, setType] = useState('GENERAL_SYSTEM_DESCRIPTION');
  const [assetId, setAssetId] = useState('');
  const [obligationId, setObligationId] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    onCreate({
      documentType: type,
      title: String(data.get('title')),
      description: String(data.get('description') ?? ''),
      referenceUrl: String(data.get('referenceUrl') ?? ''),
      systemAssetId: assetId || undefined,
      aiSystemObligationId: obligationId || undefined,
    });
    form.reset();
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
        Stage 3
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        Document evidence and gaps
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {model.documentationItems.map((item) => (
          <article key={item.id} className="rounded-xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              {item.documentType.replaceAll('_', ' ')}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {item.systemAsset?.name ?? 'No asset linked'} ·{' '}
              {item.obligation?.obligation.catalogueId ??
                'No requirement linked'}
            </p>
            {item.referenceUrl ? (
              <a
                href={item.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-sky-700"
              >
                Open reference ↗
              </a>
            ) : null}
          </article>
        ))}
      </div>
      <form
        className="mt-5 space-y-4 rounded-xl border border-slate-200 p-4"
        onSubmit={submit}
      >
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">
            Documentation type
          </legend>
          <Pills options={documentTypes} value={type} onChange={setType} />
        </fieldset>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Title
            <input
              required
              name="title"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            HTTP(S) reference
            <input
              name="referenceUrl"
              type="url"
              placeholder="https://…"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">
            Related asset
          </legend>
          <Pills
            options={[
              ['', 'None'],
              ...model.assets.map((asset) => [asset.id, asset.name] as const),
            ]}
            value={assetId}
            onChange={setAssetId}
          />
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">
            Related requirement
          </legend>
          <Pills
            options={[
              ['', 'None'],
              ...model.obligations.map(
                (item) => [item.id, item.obligation.catalogueId] as const,
              ),
            ]}
            value={obligationId}
            onChange={setObligationId}
          />
        </fieldset>
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            name="description"
            rows={2}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <p className="text-xs text-slate-500">
          Select at least one related asset or requirement. This keeps every
          documentation record inside the traceability chain.
        </p>
        <button
          type="submit"
          disabled={pending || (!assetId && !obligationId)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add documentation item'}
        </button>
      </form>
    </section>
  );
}

function VersionComparison({ model }: { model: TraceabilityModel }) {
  const versions = model.history
    .filter((entry) => entry.source === 'ASSESSMENT' && entry.snapshot)
    .sort(
      (left, right) => (left.versionNumber ?? 0) - (right.versionNumber ?? 0),
    );
  const [fromVersion, setFromVersion] = useState<string>('');
  const [toVersion, setToVersion] = useState<string>('');
  useEffect(() => {
    if (versions.length > 1 && !fromVersion && !toVersion) {
      setFromVersion(versions.at(-2)?.id ?? '');
      setToVersion(versions.at(-1)?.id ?? '');
    }
  }, [fromVersion, toVersion, versions]);
  if (versions.length < 2) return null;
  const from =
    versions.find((entry) => entry.id === fromVersion) ?? versions.at(-2)!;
  const to =
    versions.find((entry) => entry.id === toVersion) ?? versions.at(-1)!;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
        Assessment comparison
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        What changed between versions
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Compare recorded assessment snapshots. Human review is required before
        relying on changes.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(
          [
            ['Earlier version', from, setFromVersion],
            ['Later version', to, setToVersion],
          ] as const
        ).map(([label, entry, set]) => (
          <label key={label} className="text-sm font-medium text-slate-700">
            {label}
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              value={entry.id}
              onChange={(event) => set(event.target.value)}
            >
              {versions.map((option) => (
                <option key={option.id} value={option.id}>
                  v{option.versionNumber} ·{' '}
                  {option.action.replaceAll('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[from, to].map((entry) => (
          <pre
            key={entry.id}
            className="overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700"
          >
            {JSON.stringify(entry.snapshot, null, 2)}
          </pre>
        ))}
      </div>
    </section>
  );
}

function HistoryPanel({ model }: { model: TraceabilityModel }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
        Append-only history
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        Traceability change history
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Assessment versions and traceability edits are recorded with the actor
        and time of change.
      </p>
      <ol className="mt-4 space-y-3">
        {model.history.map((entry) => (
          <li
            key={`${entry.source}-${entry.id}`}
            className="border-l-2 border-slate-200 pl-3 text-sm"
          >
            <p className="font-semibold text-slate-900">
              {entry.versionNumber ? `v${entry.versionNumber} · ` : ''}
              {entry.action.replaceAll('_', ' ').toLowerCase()}
            </p>
            <p className="text-slate-600">
              {entry.entityType} · {entry.actor}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ol>
      {!model.history.length ? (
        <p className="mt-4 text-sm text-slate-500">
          No traceability changes have been recorded yet.
        </p>
      ) : null}
    </section>
  );
}

function Pills<T extends string>({
  options,
  value,
  onChange,
  compact = false,
  disabled = false,
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
      {options.map(([option, label]) => (
        <button
          key={option || 'none'}
          type="button"
          aria-pressed={value === option}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            value === option
              ? 'border-sky-700 bg-sky-700 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
