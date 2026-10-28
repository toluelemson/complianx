import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type {
  ReviewerItem,
  TrackableStepSummary,
} from '@complianx/contracts/ai-systems';

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
  reviewers: ReviewerItem[];
  availableReviewers: ReviewerItem[];
  canAssignSelf: boolean;
  canSendForReview?: boolean;
  canStartReview?: boolean;
  sendForReviewDisabled?: boolean;
  canApprove?: boolean;
  canRequestChanges?: boolean;
  disableAssignmentFields?: boolean;
  userId?: string;
  projectId?: string;
  canCompleteSections?: boolean;
  canReviewSections?: boolean;
  onSectionWorkflowAction?: (
    stepId: string,
    action: 'complete' | 'start-review' | 'approve',
    signature?: string,
  ) => void;
  sectionActionPending?: boolean;
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'hz-review-status hz-review-status--warning',
  READY_FOR_REVIEW: 'hz-review-status hz-review-status--brand',
  IN_REVIEW: 'hz-review-status hz-review-status--brand',
  RESUBMITTED: 'hz-review-status hz-review-status--brand',
  APPROVED: 'hz-review-status hz-review-status--success',
  ARCHIVED: 'hz-review-status hz-review-status--neutral',
  CHANGES_REQUESTED: 'hz-review-status hz-review-status--danger',
  REJECTED: 'hz-review-status hz-review-status--danger',
  CANCELLED: 'hz-review-status hz-review-status--neutral',
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
  canStartReview = true,
  sendForReviewDisabled,
  canApprove = true,
  canRequestChanges = true,
  disableAssignmentFields = false,
  userId,
  projectId,
  canCompleteSections = false,
  canReviewSections = false,
  onSectionWorkflowAction,
  sectionActionPending = false,
}: ReviewApprovalPanelProps) {
  const [approvalStepId, setApprovalStepId] = useState<string | null>(null);
  const [sectionSignature, setSectionSignature] = useState('');
  const totalMissing = trackableSteps.reduce(
    (sum, step) => sum + step.missing,
    0,
  );
  const readySteps = trackableSteps.filter((step) => step.missing === 0).length;
  const reviewBlocked =
    sendForReviewDisabled ??
    (!canSendForReview ||
      projectStatusLabel === 'IN_REVIEW' ||
      projectStatusLabel === 'APPROVED' ||
      !reviewerId ||
      totalMissing > 0);
  const reviewInProgress = projectStatusLabel === 'IN_REVIEW';
  const projectApproved = projectStatusLabel === 'APPROVED';
  const approvedSteps = trackableSteps.filter(
    (step) => step.status === 'APPROVED',
  ).length;
  const allSectionsApproved =
    trackableSteps.length > 0 && approvedSteps === trackableSteps.length;
  const sectionsAwaitingApproval = trackableSteps.length - approvedSteps;
  const showBeforeReviewGate =
    reviewBlocked && !reviewInProgress && !projectApproved;
  const assignmentLocked =
    disableAssignmentFields ||
    !canSendForReview ||
    reviewInProgress ||
    projectApproved;
  const approveBlocked =
    !canApprove ||
    projectStatusLabel !== 'IN_REVIEW' ||
    !allSectionsApproved;
  const requestChangesBlocked =
    !canRequestChanges || projectStatusLabel !== 'IN_REVIEW';
  const projectStatusClass =
    PROJECT_STATUS_STYLES[projectStatusLabel] ??
    'hz-review-status hz-review-status--neutral';
  const incompleteSteps = trackableSteps.filter((step) => step.missing > 0);

  return (
    <Card className="hz-review-panel overflow-hidden">
      <div className="hz-review-panel__header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="hz-review-panel__eyebrow">Ready for a human check</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h3 className="hz-review-panel__title">
                Review and approval flow
              </h3>
              <Badge className={projectStatusClass}>
                {projectStatusDisplay ?? projectStatusLabel}
              </Badge>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              {reviewInProgress
                ? allSectionsApproved
                  ? 'All sections are approved. Record the final project decision.'
                  : 'Approve each section first. The final project approval unlocks when every section has been approved.'
                : projectApproved
                  ? 'This project has been approved. Its decision history remains below.'
                  : 'Pick a reviewer, fix anything missing, then ask a person to check the work.'}
            </p>
          </div>
          <div className="text-sm text-slate-600 lg:text-right">
            <span className="font-semibold text-slate-900">
              {readySteps}/{trackableSteps.length || 0} sections ready
            </span>
            <span className="mx-2 text-slate-300">·</span>
            <span
              className={totalMissing ? 'text-amber-700' : 'text-emerald-700'}
            >
              {totalMissing} open issues
            </span>
            <span className="mx-2 text-slate-300">·</span>
            <span>{reviewerId ? 'Reviewer assigned' : 'Reviewer missing'}</span>
          </div>
        </div>
      </div>

      <div className="hz-review-panel__body grid gap-5 px-5 py-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {showBeforeReviewGate ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                Before you ask for review
              </p>
              <h4 className="mt-1 font-semibold text-amber-950">
                Resolve these before sending for review
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-amber-950">
                {!reviewerId ? (
                  <li>• Assign a reviewer in the owner panel.</li>
                ) : null}
                {incompleteSteps.map((step) => (
                  <li key={step.stepId}>
                    • {step.title}: {step.missing} item
                    {step.missing === 1 ? '' : 's'} missing{' '}
                    {projectId ? (
                      <Link
                        to={`/projects/${projectId}/compliance-workspace`}
                        className="font-semibold underline underline-offset-2"
                      >
                        Resolve →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
              {reviewerId && incompleteSteps.length === 0 ? (
                <p className="mt-3 text-sm text-amber-950">
                  This project needs another step before review can begin. Check
                  the activity history to see what to do next.
                </p>
              ) : null}
            </section>
          ) : null}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Review summary
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {reviewInProgress
                ? allSectionsApproved
                  ? 'Decision requested: record the final project approval or request changes.'
                  : `${approvedSteps}/${trackableSteps.length} sections approved. Approve the remaining ${sectionsAwaitingApproval} before approving the project.`
                : projectApproved
                  ? 'Decision recorded: this project is approved.'
                  : 'Prepare the work for review by resolving missing items and assigning a reviewer.'}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <BriefMetric label="Ready sections" value={`${readySteps}/${trackableSteps.length}`} />
              <BriefMetric
                label="Section approvals"
                value={`${approvedSteps}/${trackableSteps.length}`}
              />
              <BriefMetric label="Reviewer" value={reviewerId ? 'Assigned' : 'Not assigned'} />
            </div>
          </section>
          <details open={reviewInProgress && !allSectionsApproved}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              What is done ({readySteps}/{trackableSteps.length || 0} ready)
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Sections with missing data stay visibly blocked until resolved.
            </p>
            <div className="mt-3 grid gap-3">
              {trackableSteps.map((step) => (
                <TrackableStepRow
                  key={step.stepId}
                  step={step}
                  canComplete={canCompleteSections}
                  canReview={canReviewSections}
                  actionPending={sectionActionPending}
                  approvalOpen={approvalStepId === step.stepId}
                  signature={sectionSignature}
                  onSignatureChange={setSectionSignature}
                  onOpenApproval={() => {
                    setApprovalStepId(step.stepId);
                    setSectionSignature('');
                  }}
                  onCancelApproval={() => setApprovalStepId(null)}
                  onAction={(action, signature) => {
                    onSectionWorkflowAction?.(step.stepId, action, signature);
                    if (action === 'approve') setApprovalStepId(null);
                  }}
                />
              ))}
            </div>
          </details>
        </div>

        <Card className="hz-review-panel__owner space-y-4 rounded-[24px] bg-slate-50/80 p-4 shadow-none">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Assign owners
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Choose one reviewer before sending this for review.
            </p>
          </div>

          <div className="grid gap-3">
            <AssignmentField
              label="Reviewer"
              disabled={assignmentLocked}
              value={reviewerId ?? ''}
              options={availableReviewers.map((reviewer) => ({
                value: reviewer.id,
                label: reviewer.email,
              }))}
              placeholder="Select reviewer"
              onChange={onReviewerChange}
              onAssignSelf={
                canAssignSelf && userId
                  ? () => onReviewerChange(userId)
                  : undefined
              }
            />
            {!availableReviewers.length && (
              <p className="text-xs font-medium text-rose-600">
                No reviewers available. An admin needs to assign one first.
              </p>
            )}
          </div>

          <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Add approver or review note (optional)
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              Assign an approver when someone else should make the final
              decision. A company administrator can approve without one.
            </p>
            <div className="mt-4 space-y-4">
              <AssignmentField
                label="Approver"
                hint="Optional"
                disabled={assignmentLocked}
                value={approverId ?? ''}
                options={reviewers.map((reviewer) => ({
                  value: reviewer.id,
                  label: `${reviewer.email} · ${reviewer.role}`,
                }))}
                placeholder="None"
                onChange={onApproverChange}
                onAssignSelf={
                  canAssignSelf && userId
                    ? () => onApproverChange(userId)
                    : undefined
                }
              />
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Review note
                </label>
                <Textarea
                  value={reviewMessage}
                  onChange={(event) => setReviewMessage(event.target.value)}
                  rows={3}
              disabled={assignmentLocked}
                  className="mt-2 min-h-[92px]"
                  placeholder="Add context, decision criteria, or a short note for the reviewer."
                />
              </div>
            </div>
          </details>

          <Card className="hz-review-panel__gate rounded-2xl bg-white p-3 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              What happens next
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {reviewInProgress
                ? allSectionsApproved
                  ? 'Every section is approved. You can now approve the project or request changes.'
                  : `${sectionsAwaitingApproval} section${sectionsAwaitingApproval === 1 ? '' : 's'} still need approval before the project can be approved.`
                : projectApproved
                  ? 'This project is approved. Its documents and activity history are ready when you need them.'
                  : reviewBlocked
                ? !reviewerId
                    ? 'Choose a reviewer before you can send this.'
                    : (projectStatusLabel === 'READY_FOR_REVIEW' ||
                        projectStatusLabel === 'RESUBMITTED') &&
                        !canStartReview
                      ? 'The assigned reviewer needs to sign in and start this review.'
                  : totalMissing > 0
                    ? 'Resolve open section issues before sending this project forward.'
                    : 'This project cannot move into review in its current state.'
                : 'This project is ready for review.'}
            </p>
          </Card>
        </Card>
      </div>

      <div className="hz-review-panel__footer border-t border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-600">
            {reviewInProgress
              ? allSectionsApproved
                ? 'All section approvals are complete. Choose the final project decision.'
                : 'Approve the remaining sections before recording the final project decision.'
              : projectApproved
                ? 'This project is approved and ready for its record to be used.'
                : reviewBlocked
              ? 'Resolve the release gate to move this project forward.'
              : 'The project is ready for the next review step.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {canSendForReview &&
            projectStatusLabel !== 'IN_REVIEW' &&
            projectStatusLabel !== 'APPROVED' ? (
              <Button
                type="button"
                variant="secondary"
                className="h-auto flex-1 md:flex-none"
                onClick={onSendForReview}
                disabled={reviewBlocked}
              >
                {sendForReviewLabel}
              </Button>
            ) : null}
            {canApprove && projectStatusLabel === 'IN_REVIEW' ? (
              <Button
                type="button"
                variant="default"
                className="h-auto flex-1 md:flex-none"
                onClick={onApprove}
                disabled={approveBlocked}
              >
                Approve project
              </Button>
            ) : null}
            {canRequestChanges && projectStatusLabel === 'IN_REVIEW' ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto flex-1 md:flex-none"
                onClick={onRequestChanges}
                disabled={requestChangesBlocked}
              >
                Request changes
              </Button>
            ) : null}
          </div>
        </div>
        {!canSendForReview && (
          <p className="hz-review-panel__paywall mt-3 text-[11px] font-semibold text-slate-400">
            Reviews are available on paid plans.&nbsp;
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('paywall'))}
              className="text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              See plans
            </button>
          </p>
        )}
      </div>
    </Card>
  );
}

function BriefMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TrackableStepRow({
  step,
  canComplete,
  canReview,
  actionPending,
  approvalOpen,
  signature,
  onSignatureChange,
  onOpenApproval,
  onCancelApproval,
  onAction,
}: {
  step: TrackableStepSummary;
  canComplete: boolean;
  canReview: boolean;
  actionPending: boolean;
  approvalOpen: boolean;
  signature: string;
  onSignatureChange: (value: string) => void;
  onOpenApproval: () => void;
  onCancelApproval: () => void;
  onAction: (
    action: 'complete' | 'start-review' | 'approve',
    signature?: string,
  ) => void;
}) {
  const animatedMissing = useAnimatedNumber(step.missing, { duration: 600 });
  const isReady = step.missing === 0;
  const isApproved = step.status === 'APPROVED';

  return (
    <Card
      className={`hz-review-panel__step rounded-2xl border px-4 py-3 transition ${
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
        <Badge
          variant={isReady ? 'success' : 'warning'}
          className="shrink-0 px-3 py-1 text-[11px]"
        >
          {step.missing
            ? `${animatedMissing} missing`
            : isApproved
              ? 'Approved'
              : 'Needs approval'}
        </Badge>
      </div>
      {step.missing === 0 && step.status === 'DRAFT' && canComplete ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={actionPending}
          onClick={() => onAction('complete')}
        >
          Mark ready
        </Button>
      ) : null}
      {step.status === 'COMPLETE' && canReview ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={actionPending}
          onClick={() => onAction('start-review')}
        >
          Start section review
        </Button>
      ) : null}
      {step.status === 'IN_REVIEW' && canReview ? (
        approvalOpen ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              aria-label={`${step.title} approval signature`}
              value={signature}
              onChange={(event) => onSignatureChange(event.target.value)}
              placeholder="Type your signature"
              className="min-h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm"
            />
            <Button
              type="button"
              size="sm"
              disabled={actionPending || !signature.trim()}
              onClick={() => onAction('approve', signature.trim())}
            >
              Approve section
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancelApproval}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" className="mt-3" disabled={actionPending} onClick={onOpenApproval}>
            Approve section
          </Button>
        )
      ) : null}
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
        {hint ? (
          <span className="text-[11px] text-slate-400">{hint}</span>
        ) : null}
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
            Assign yourself
          </Button>
        ) : null}
      </div>
    </div>
  );
}
