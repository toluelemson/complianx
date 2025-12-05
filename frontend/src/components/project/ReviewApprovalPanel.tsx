import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

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
  canApprove?: boolean;
  canRequestChanges?: boolean;
  userId?: string;
}

export function ReviewApprovalPanel({
  trackableSteps,
  projectStatusLabel,
  projectStatusDisplay,
  onSendForReview,
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
  canApprove = true,
  canRequestChanges = true,
  userId,
}: ReviewApprovalPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Review & approval</h3>
          <span className="text-xs font-semibold text-slate-500">
            Project status · {projectStatusDisplay ?? projectStatusLabel}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Make sure every section is complete before sending for review or approval.
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="grid gap-2">
          {trackableSteps.map((step) => (
            <TrackableStepRow key={step.stepId} step={step} />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wide text-slate-400">
              Reviewer
            </label>
            <div className="flex items-center gap-2">
              <select
                disabled={!canSendForReview}
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                value={reviewerId ?? ''}
                onChange={(event) => onReviewerChange(event.target.value)}
              >
                <option value="">Select reviewer</option>
                {availableReviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.email}
                  </option>
                ))}
              </select>
              {canAssignSelf && userId ? (
                <button
                  type="button"
                  onClick={() => onReviewerChange(userId)}
                  disabled={!canSendForReview}
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Use me
                </button>
              ) : null}
            </div>
            {!availableReviewers.length && (
              <p className="text-[10px] text-rose-500">
                No reviewers available; have an admin assign one.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wide text-slate-400">
              Approver (optional)
            </label>
            <div className="flex items-center gap-2">
              <select
                disabled={!canSendForReview}
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                value={approverId ?? ''}
                onChange={(event) => onApproverChange(event.target.value)}
              >
                <option value="">None</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.email} · {reviewer.role}
                  </option>
                ))}
              </select>
              {canAssignSelf && userId ? (
                <button
                  type="button"
                  onClick={() => onApproverChange(userId)}
                  disabled={!canSendForReview}
                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Use me
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-slate-400">
            Message (optional)
          </label>
          <textarea
            value={reviewMessage}
            onChange={(event) => setReviewMessage(event.target.value)}
            rows={2}
            disabled={!canSendForReview}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
            placeholder="Share context or special instructions with the reviewer"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
          onClick={onSendForReview}
          disabled={
            !canSendForReview ||
            projectStatusLabel === 'IN_REVIEW' ||
            projectStatusLabel === 'APPROVED'
          }
        >
          Send for review
        </button>
        <button
          type="button"
          className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
          onClick={onApprove}
          disabled={!canApprove || projectStatusLabel !== 'IN_REVIEW'}
        >
          Approve project
        </button>
        <button
          type="button"
          className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
          onClick={onRequestChanges}
          disabled={
            !canRequestChanges ||
            projectStatusLabel === 'DRAFT' ||
            projectStatusLabel === 'CHANGES_REQUESTED'
          }
        >
          Request changes
        </button>
      </div>
    </div>
  );
}

function TrackableStepRow({ step }: { step: TrackableStepSummary }) {
  const animatedMissing = useAnimatedNumber(step.missing, { duration: 600 });
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600"
    >
      <div>
        <p className="font-semibold text-slate-900">{step.title}</p>
        <p className="text-[10px] text-slate-500">Status: {step.status}</p>
      </div>
      <span className="px-2 py-1 text-[10px] font-semibold text-rose-700">
        {step.missing ? `${animatedMissing} missing` : 'Ready'}
      </span>
    </div>
  );
}
