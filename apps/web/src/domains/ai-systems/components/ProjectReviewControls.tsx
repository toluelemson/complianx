import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type {
  ProjectDetail,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import { useAuth } from '@/app/providers/AuthContext';
import { ReviewApprovalPanel } from '@/domains/workflows/components/ReviewApprovalPanel';
import {
  getBillingPlan,
  listProjectReviewers,
  runProjectWorkflowAction,
} from '../api';
import { STEP_CONFIG } from '../constants/steps';
import { useProjectWorkflow } from '../hooks/useProjectWorkflow';
import {
  canApproveProject,
  canRequestProjectChanges,
  canStartProjectReview,
  hasFieldValue,
  isValidApprovalSignature,
} from '../lib/project-page-logic';

export function ProjectReviewControls({
  project,
  sections,
}: {
  project: ProjectDetail;
  sections: SectionWithMeta[];
}) {
  const { user, activeCompanyId } = useAuth();
  const client = useQueryClient();
  const [reviewerChoice, setReviewerChoice] = useState<string>();
  const [approverChoice, setApproverChoice] = useState<string>();
  const [reviewMessage, setReviewMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const role = project.viewerRole ?? 'MEMBER';
  const status = project.workflowStatus ?? 'DRAFT';
  const owner = role === 'OWNER';
  const admin = user?.role === 'ADMIN';
  const canStartReview = canStartProjectReview(role, user?.role);
  const canApprove = canApproveProject(role, user?.role);
  const canRequestChanges = canRequestProjectChanges(role, user?.role);
  const monetizationEnabled =
    import.meta.env.VITE_MONETIZATION_ENABLED !== 'false';
  const plan = useQuery({
    queryKey: ['billing', 'plan'],
    enabled: monetizationEnabled,
    queryFn: getBillingPlan,
  });
  const isPaidPlan =
    !monetizationEnabled || (plan.data?.plan ?? 'FREE') !== 'FREE';
  const reviewers = useQuery({
    queryKey: ['projectReviewers', project.id, activeCompanyId],
    enabled: Boolean(owner && project.companyId && activeCompanyId),
    queryFn: () => listProjectReviewers(project.id),
  });
  const availableReviewers = (reviewers.data ?? []).filter(({ role }) =>
    ['REVIEWER', 'ADMIN'].includes(role),
  );
  const availableApprovers = (reviewers.data ?? []).filter(({ role }) =>
    ['APPROVER', 'ADMIN'].includes(role),
  );
  const reviewerId =
    (reviewerChoice ?? project.reviewerId ?? availableReviewers[0]?.id) || null;
  const approverId =
    (approverChoice ?? project.approverId ?? availableApprovers[0]?.id) || null;
  const sectionByName = new Map(
    sections.map((section) => [section.name, section]),
  );
  const documentationSteps = STEP_CONFIG.filter(
    (step) => step.fields.length,
  ).map((step) => {
    const section = sectionByName.get(step.id);
    return {
      stepId: section?.id ?? step.id,
      title: step.title,
      missing: step.fields.filter(
        (field) => !hasFieldValue(section?.content?.[field.name]),
      ).length,
      status: section?.workflowStatus ?? 'DRAFT',
    };
  });
  const documentationIds = new Set(
    documentationSteps.map((step) => step.stepId),
  );
  const trackableSteps = [
    ...documentationSteps,
    ...sections
      .filter((section) => !documentationIds.has(section.id))
      .map((section) => ({
        stepId: section.id,
        title: section.name,
        missing: 0,
        status: section.workflowStatus,
      })),
  ];
  const allFieldsComplete = documentationSteps.every(
    (step) => step.missing === 0,
  );
  const invalidate = () => {
    void Promise.all([
      client.invalidateQueries({
        queryKey: ['project', project.id, activeCompanyId],
      }),
      client.invalidateQueries({
        queryKey: ['sections', project.id, activeCompanyId],
      }),
      client.invalidateQueries({
        queryKey: ['project-workflow-summary', project.id, activeCompanyId],
      }),
      client.invalidateQueries({ queryKey: ['projects', activeCompanyId] }),
    ]);
  };
  const workflow = useProjectWorkflow({
    projectId: project.id,
    status,
    version: project.workflowVersion,
    isPaidPlan,
    isOwner: owner,
    canStartReview,
    canApprove,
    canRequestChanges,
    allFieldsComplete,
    reviewerId,
    approverId,
    reviewMessage,
    onPaywall: () => window.dispatchEvent(new Event('paywall')),
    onSuccess: () => {
      invalidate();
      setShowSignature(false);
      setSignature('');
      setReviewMessage('');
    },
  });
  const sectionAction = useMutation({
    mutationFn: ({
      id,
      action,
      signature,
    }: {
      id: string;
      action: string;
      signature?: string;
    }) =>
      runProjectWorkflowAction({
        endpoint: `/sections/${id}/workflow/${action}`,
        body: signature ? { signature } : {},
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Section review updated');
    },
    onError: () => toast.error('Unable to update section review'),
  });
  const starting = ['READY_FOR_REVIEW', 'RESUBMITTED'].includes(status);
  const assignmentsLocked =
    starting ||
    [
      'IN_REVIEW',
      'APPROVED',
      'MONITORING',
      'ARCHIVED',
      'REJECTED',
      'CANCELLED',
    ].includes(status);
  const canSubmit = starting
    ? canStartReview
    : owner && !assignmentsLocked && Boolean(reviewerId) && allFieldsComplete;

  return (
    <>
      <ReviewApprovalPanel
        trackableSteps={trackableSteps}
        projectStatusLabel={status}
        projectStatusDisplay={status.replaceAll('_', ' ').toLowerCase()}
        onSendForReview={workflow.sendForReview}
        sendForReviewLabel={
          starting
            ? 'Start review'
            : status === 'CHANGES_REQUESTED'
              ? 'Resubmit project'
              : 'Send for review'
        }
        onApprove={() => setShowSignature(true)}
        onRequestChanges={workflow.requestChanges}
        reviewerId={reviewerId}
        approverId={approverId}
        onReviewerChange={setReviewerChoice}
        onApproverChange={setApproverChoice}
        reviewMessage={reviewMessage}
        setReviewMessage={setReviewMessage}
        reviewers={reviewers.data ?? []}
        availableReviewers={availableReviewers}
        canAssignSelf={owner && (user?.role === 'REVIEWER' || admin)}
        canSendForReview={owner || canStartReview}
        canStartReview={canStartReview}
        sendForReviewDisabled={!isPaidPlan || workflow.isPending || !canSubmit}
        canApprove={canApprove && isPaidPlan && !workflow.isPending}
        canRequestChanges={
          canRequestChanges && isPaidPlan && !workflow.isPending
        }
        disableAssignmentFields={assignmentsLocked || !owner}
        userId={user?.id}
        projectId={project.id}
        canCompleteSections={owner || admin}
        canReviewSections={role === 'REVIEWER' || admin}
        sectionActionPending={sectionAction.isPending}
        onSectionWorkflowAction={(sectionId, action, signature) =>
          sectionAction.mutate({ id: sectionId, action, signature })
        }
      />
      {showSignature && (
        <form
          className="rounded-xl border border-slate-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValidApprovalSignature(signature))
              workflow.approveWithSignature(signature.trim());
          }}
        >
          <label className="block text-sm font-medium">
            Signature
            <input
              required
              className="mt-1 block w-full rounded border border-slate-300 p-2"
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              className="hz-button hz-button--primary"
              type="submit"
              disabled={!signature.trim() || workflow.isPending}
            >
              Record approval
            </button>
            <button
              className="hz-button hz-button--outline"
              type="button"
              onClick={() => setShowSignature(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
