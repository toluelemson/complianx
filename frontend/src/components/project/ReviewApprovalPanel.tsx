import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface TrackableStepSummary {
  stepId: string;
  title: string;
  missing: number;
  status: string;
}

interface Reviewer {
  id: string;
  email: string;
  role: string;
}

interface ReviewApprovalPanelProps {
  trackableSteps: TrackableStepSummary[];
  projectStatusLabel: string;
  projectStatusDisplay?: string;
  onSendForReview: () => void;
  sendForReviewLabel?: string;
  onApprove: () => void;
  onRequestChanges: () => void;
  reviewerId: string | null;
  approverId: string | null;
  onReviewerChange: (value: string) => void;
  onApproverChange: (value: string) => void;
  reviewMessage: string;
  setReviewMessage: (value: string) => void;
  reviewers: Reviewer[];
  availableReviewers: Reviewer[];
  canAssignSelf: boolean;
  canSendForReview?: boolean;
  sendForReviewDisabled?: boolean;
  canApprove?: boolean;
  canRequestChanges?: boolean;
  disableAssignmentFields?: boolean;
  userId?: string;
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-amber-200 bg-amber-50 text-amber-900',
  READY_FOR_REVIEW: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  IN_REVIEW: 'border-sky-200 bg-sky-50 text-sky-900',
  RESUBMITTED: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  ARCHIVED: 'border-slate-300 bg-slate-100 text-slate-800',
  CHANGES_REQUESTED: 'border-rose-200 bg-rose-50 text-rose-900',
  REJECTED: 'border-rose-300 bg-rose-100 text-rose-900',
  CANCELLED: 'border-slate-300 bg-slate-100 text-slate-800',
};

export function ReviewApprovalPanel({
  trackableSteps,
  projectStatusLabel,
  projectStatusDisplay,
  onSendForReview,
  sendForReviewLabel = 'Send for review',
  onApprove,
  onRequestChanges,
  reviewerId,
  approverId,
  onReviewerChange,
  onApproverChange,
  reviewMessage,
  setReviewMessage,
  reviewers,
  availableReviewers,
  canAssignSelf,
  canSendForReview = true,
  sendForReviewDisabled,
  canApprove = true,
  canRequestChanges = true,
  disableAssignmentFields = false,
  userId,
}: ReviewApprovalPanelProps) {
  const totalMissing = trackableSteps.reduce((sum, step) => sum + step.missing, 0);
  const readySteps = trackableSteps.filter((step) => step.missing === 0).length;
  const reviewBlocked =
    sendForReviewDisabled ??
    (!canSendForReview ||
      projectStatusLabel === 'IN_REVIEW' ||
      projectStatusLabel === 'APPROVED' ||
      !reviewerId ||
      totalMissing > 0);
  const approveBlocked = !canApprove || projectStatusLabel !== 'IN_REVIEW';
  const requestChangesBlocked =
    !canRequestChanges || projectStatusLabel !== 'IN_REVIEW';
  const projectStatusClass =
    PROJECT_STATUS_STYLES[projectStatusLabel] ??
    'border-slate-200 bg-slate-100 text-slate-800';

  return (
    <Card className="overflow-hidden shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#fff7ed_100%)] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-serif text-xs uppercase tracking-[0.28em] text-slate-500">
              Governance checkpoint
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h3 className="font-serif text-2xl font-semibold tracking-tight text-slate-950">
                Review and approval flow
              </h3>
              <Badge
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${projectStatusClass}`}
              >
                {projectStatusDisplay ?? projectStatusLabel}
              </Badge>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Route this project through review with a named owner, visible blockers,
              and a clean approval path.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Ready sections" value={`${readySteps}/${trackableSteps.length || 0}`} />
            <StatCard
              label="Open issues"
              value={String(totalMissing)}
              tone={totalMissing ? 'warning' : 'success'}
            />
            <StatCard
              label="Reviewer"
              value={reviewerId ? 'Assigned' : 'Missing'}
              tone={reviewerId ? 'default' : 'warning'}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Completion map
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Sections with missing data stay visibly blocked until resolved.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {trackableSteps.map((step) => (
              <TrackableStepRow key={step.stepId} step={step} />
            ))}
          </div>
        </div>

        <Card className="space-y-4 rounded-[24px] bg-slate-50/80 p-4 shadow-none">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Assign owners
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Put one reviewer on the record before handing this off.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <AssignmentField
              label="Reviewer"
              disabled={disableAssignmentFields || !canSendForReview}
              value={reviewerId ?? ''}
              options={availableReviewers.map((reviewer) => ({
                value: reviewer.id,
                label: reviewer.email,
              }))}
              placeholder="Select reviewer"
              onChange={onReviewerChange}
              onAssignSelf={
                canAssignSelf && userId ? () => onReviewerChange(userId) : undefined
              }
            />
            {!availableReviewers.length && (
              <p className="text-xs font-medium text-rose-600">
                No reviewers available. An admin needs to assign one first.
              </p>
            )}
            <AssignmentField
              label="Approver"
              hint="Optional"
              disabled={disableAssignmentFields || !canSendForReview}
              value={approverId ?? ''}
              options={reviewers.map((reviewer) => ({
                value: reviewer.id,
                label: `${reviewer.email} · ${reviewer.role}`,
              }))}
              placeholder="None"
              onChange={onApproverChange}
              onAssignSelf={
                canAssignSelf && userId ? () => onApproverChange(userId) : undefined
              }
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Review note
            </label>
            <Textarea
              value={reviewMessage}
              onChange={(event) => setReviewMessage(event.target.value)}
              rows={3}
              disabled={!canSendForReview}
              className="mt-2 min-h-[92px]"
              placeholder="Add context, decision criteria, or a short note for the reviewer."
            />
          </div>

          <Card className="rounded-2xl bg-white p-3 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Release gate
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {reviewBlocked
                ? !reviewerId
                  ? 'Assign a reviewer to unlock submission.'
                  : totalMissing > 0
                    ? 'Resolve open section issues before sending this project forward.'
                    : 'This project cannot move into review in its current state.'
                : 'This project is ready to move into formal review.'}
            </p>
          </Card>
        </Card>
      </div>

      <div className="border-t border-slate-200 bg-slate-950 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-300">
            Use the workflow below to move the project forward or send it back with context.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              className="h-auto flex-1 bg-white px-4 py-3 text-slate-950 hover:bg-slate-100 md:flex-none"
              onClick={onSendForReview}
              disabled={reviewBlocked}
            >
              {sendForReviewLabel}
            </Button>
            <Button
              type="button"
              className="h-auto flex-1 bg-emerald-500 px-4 py-3 text-white hover:bg-emerald-400 md:flex-none"
              onClick={onApprove}
              disabled={approveBlocked}
            >
              Approve project
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-1 border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100 md:flex-none"
              onClick={onRequestChanges}
              disabled={requestChangesBlocked}
            >
              Request changes
            </Button>
          </div>
        </div>
        {!canSendForReview && (
          <p className="mt-3 text-[11px] font-semibold text-slate-400">
            Reviews are available on paid plans.&nbsp;
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('paywall'))}
              className="text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
            >
              See plans
            </button>
          </p>
        )}
      </div>
    </Card>
  );
}

function TrackableStepRow({ step }: { step: TrackableStepSummary }) {
  const animatedMissing = useAnimatedNumber(step.missing, { duration: 600 });
  const isReady = step.missing === 0;

  return (
    <Card
      className={`rounded-2xl border px-4 py-3 transition ${
        isReady
          ? 'border-emerald-100 bg-emerald-50/70'
          : 'border-amber-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              isReady
                ? 'bg-emerald-600 text-white'
                : 'border border-amber-300 bg-amber-50 text-amber-700'
            }`}
          >
            {isReady ? '✓' : '!'}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {step.status}
            </p>
          </div>
        </div>
        <Badge variant={isReady ? 'success' : 'warning'} className="shrink-0 px-3 py-1 text-[11px]">
          {step.missing ? `${animatedMissing} missing` : 'Ready'}
        </Badge>
      </div>
    </Card>
  );
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-white/90 text-amber-950'
      : tone === 'success'
        ? 'border-emerald-200 bg-white/90 text-emerald-950'
        : 'border-slate-200 bg-white/90 text-slate-950';

  return (
    <Card className={`min-w-[9rem] rounded-2xl px-4 py-3 backdrop-blur shadow-none ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

function AssignmentField({
  label,
  hint,
  disabled,
  value,
  options,
  placeholder,
  onChange,
  onAssignSelf,
}: {
  label: string;
  hint?: string;
  disabled: boolean;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  onAssignSelf?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {label}
        </label>
        {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <Select
          disabled={disabled}
          className="min-h-11 flex-1 rounded-xl"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {onAssignSelf ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAssignSelf}
            disabled={disabled}
            className="min-h-11 rounded-xl"
          >
            Use me
          </Button>
        ) : null}
      </div>
    </div>
  );
}
