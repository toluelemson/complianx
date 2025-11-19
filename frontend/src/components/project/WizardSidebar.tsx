import { STEP_CONFIG, TRACKABLE_STEP_COUNT, type StepField } from '../../constants/steps';
import type { SectionWithMeta } from '../../pages/ProjectPage';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

interface WizardSidebarProps {
  completionRate: number;
  completedCount: number;
  completedSteps: Set<string>;
  sectionByName: Map<string, SectionWithMeta>;
  incompleteFieldsByStep: Map<string, StepField[]>;
  activeStepId: string;
  setActiveStepId: (id: string) => void;
  projectQuery: any;
}

export function WizardSidebar({
  completionRate,
  completedCount,
  sectionByName,
  incompleteFieldsByStep,
  activeStepId,
  setActiveStepId,
  projectQuery,
}: WizardSidebarProps) {
  const animatedCompletionRate = useAnimatedNumber(completionRate, { duration: 700 });
  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Wizard Progress</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">
          {animatedCompletionRate}%
        </p>
        <p className="text-xs text-slate-500">
          {completedCount} / {TRACKABLE_STEP_COUNT} compliance sections saved
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${animatedCompletionRate}%` }}
          />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <ul>
          {STEP_CONFIG.map((step, index) => (
            <WizardStepRow
              key={step.id}
              step={step}
              index={index}
              missingCount={incompleteFieldsByStep.get(step.id)?.length ?? 0}
              sectionMeta={sectionByName.get(step.id)}
              activeStepId={activeStepId}
              setActiveStepId={setActiveStepId}
            />
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Project metadata</p>
        <p className="mt-2">Industry: {projectQuery.data?.industry ?? '—'}</p>
        <p className="mt-1">Risk level: {projectQuery.data?.riskLevel ?? '—'}</p>
        <p className="mt-1">
          Created: {projectQuery.data ? new Date(projectQuery.data.createdAt).toLocaleDateString() : '—'}
        </p>
      </div>
    </aside>
  );
}

interface WizardStepRowProps {
  step: (typeof STEP_CONFIG)[number];
  index: number;
  missingCount: number;
  sectionMeta?: SectionWithMeta;
  activeStepId: string;
  setActiveStepId: (id: string) => void;
}

function WizardStepRow({
  step,
  index,
  missingCount,
  sectionMeta,
  activeStepId,
  setActiveStepId,
}: WizardStepRowProps) {
  const animatedMissing = useAnimatedNumber(missingCount, { duration: 600 });
  const badgeStyle = step.fields.length
    ? missingCount === 0
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-rose-50 text-rose-700 border border-rose-200'
    : 'bg-slate-100 text-slate-600 border border-slate-200';
  return (
    <li key={step.id}>
      <button
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm ${
          activeStepId === step.id ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600 hover:bg-slate-50'
        }`}
        onClick={() => setActiveStepId(step.id)}
      >
        <span className="flex-1">
          <span className="mr-2 text-xs font-semibold text-slate-400">{index + 1}.</span>
          <span className="block">{step.title}</span>
          {sectionMeta?.updatedAt && (
            <span className="text-[11px] font-normal text-slate-400">
              {missingCount === 0 ? 'Completed' : `${missingCount} fields remaining`}{' '}
              · {new Date(sectionMeta.updatedAt).toLocaleDateString()}
            </span>
          )}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeStyle}`}>
          {step.fields.length
            ? missingCount === 0
              ? 'Completed'
              : `${animatedMissing} missing`
            : 'Review'}
        </span>
      </button>
    </li>
  );
}
