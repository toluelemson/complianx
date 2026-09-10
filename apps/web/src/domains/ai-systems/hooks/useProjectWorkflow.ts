import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { ProjectWorkflowStatus } from '@complianx/contracts/ai-systems';
import { completeProjectSections, runProjectWorkflowAction } from '../api';

type WorkflowOptions = {
  projectId: string;
  status: ProjectWorkflowStatus;
  version?: number;
  isPaidPlan: boolean;
  isOwner: boolean;
  canStartReview: boolean;
  canApprove: boolean;
  canRequestChanges: boolean;
  allFieldsComplete: boolean;
  reviewerId?: string | null;
  approverId?: string | null;
  sectionIdsToComplete: string[];
  reviewMessage: string;
  onPaywall: () => void;
  onSuccess: () => void;
};

export function useProjectWorkflow(options: WorkflowOptions) {
  const mutation = useMutation({
    mutationFn: async (payload: {
      endpoint: string;
      body?: Record<string, unknown>;
      sectionIdsToComplete?: string[];
    }) => {
      const { sectionIdsToComplete, ...action } = payload;
      if (sectionIdsToComplete?.length) {
        await completeProjectSections(sectionIdsToComplete);
      }
      return runProjectWorkflowAction(action);
    },
    onSuccess: () => {
      options.onSuccess();
      toast.success('Project workflow updated');
    },
    onError: (error: unknown) => {
      const response = (
        error as {
          response?: { data?: { message?: string | string[] } };
        }
      ).response;
      const message = response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Unable to update project workflow',
      );
    },
  });

  const blockedByPlan = (message: string) => {
    if (options.isPaidPlan) return false;
    options.onPaywall();
    toast.error(message);
    return true;
  };

  const run = (
    endpoint: string,
    body: Record<string, unknown>,
    sectionIdsToComplete: string[] = [],
  ) => mutation.mutate({ endpoint, body, sectionIdsToComplete });

  const sendForReview = () => {
    if (blockedByPlan('Upgrade to request reviews and approvals.')) return;
    const note = options.reviewMessage.trim() || undefined;
    if (
      options.status === 'READY_FOR_REVIEW' ||
      options.status === 'RESUBMITTED'
    ) {
      if (!options.canStartReview) {
        toast.error('Only assigned reviewers can start the review');
        return;
      }
      run(`/projects/${options.projectId}/workflow/start-review`, {
        note,
        expectedVersion: options.version,
      });
      return;
    }
    if (options.status === 'CHANGES_REQUESTED') {
      if (!options.isOwner) {
        toast.error('Only owners can resubmit projects');
        return;
      }
      if (!options.allFieldsComplete) {
        toast.error('Complete every required field before resubmitting');
        return;
      }
      run(`/projects/${options.projectId}/workflow/resubmit`, {
        note,
        expectedVersion: options.version,
      });
      return;
    }
    if (!options.isOwner) {
      toast.error('Only owners can send for review');
      return;
    }
    if (!options.allFieldsComplete) {
      toast.error('Complete every required field before sending for review');
      return;
    }
    if (!options.reviewerId) {
      toast.error('Select a reviewer for this request');
      return;
    }
    run(`/projects/${options.projectId}/workflow/submit`, {
      reviewerId: options.reviewerId,
      approverId: options.approverId ?? undefined,
      note,
      expectedVersion: options.version,
    }, options.sectionIdsToComplete);
  };

  const approveWithSignature = (signature: string) => {
    if (!options.canApprove) {
      toast.error('Only assigned approvers can approve');
      return;
    }
    if (blockedByPlan('Upgrade to approve projects.')) return;
    if (options.status !== 'IN_REVIEW') {
      toast.error('Project must be in review before approving');
      return;
    }
    run(`/projects/${options.projectId}/workflow/approve`, {
      signature,
      expectedVersion: options.version,
    });
  };

  const requestChanges = () => {
    if (!options.canRequestChanges) {
      toast.error('Only assigned reviewers can request changes');
      return;
    }
    if (blockedByPlan('Upgrade to request changes and run approvals.')) return;
    if (!options.reviewMessage.trim()) {
      toast.error('Add a review note before requesting changes');
      return;
    }
    run(`/projects/${options.projectId}/workflow/request-changes`, {
      note: options.reviewMessage.trim(),
      expectedVersion: options.version,
    });
  };

  return {
    sendForReview,
    approveWithSignature,
    requestChanges,
    isPending: mutation.isPending,
  };
}
