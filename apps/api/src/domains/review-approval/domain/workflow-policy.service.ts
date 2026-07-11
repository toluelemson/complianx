import { Injectable } from '@nestjs/common';
import {
  ApproverNotAssignedError,
  InvalidWorkflowTransitionError,
  ReviewerNotAssignedError,
  UnauthorizedWorkflowActionError,
} from './workflow-errors';
import {
  PROJECT_TRANSITIONS,
  PROJECT_SYSTEM_TRANSITIONS,
  SECTION_TRANSITIONS,
} from './workflow-transition';
import {
  ProjectPermissionAction,
  ProjectWorkflowPermissionContext,
  SectionPermissionAction,
  SectionWorkflowPermissionContext,
} from './workflow.types';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from './workflow-status';

@Injectable()
export class WorkflowPolicyService {
  canTransitionProject(
    fromStatus: ProjectWorkflowStatus,
    toStatus: ProjectWorkflowStatus,
  ) {
    return PROJECT_TRANSITIONS[fromStatus].includes(toStatus);
  }

  canTransitionSection(
    fromStatus: SectionWorkflowStatus,
    toStatus: SectionWorkflowStatus,
  ) {
    return SECTION_TRANSITIONS[fromStatus].includes(toStatus);
  }

  assertProjectTransition(
    fromStatus: ProjectWorkflowStatus,
    toStatus: ProjectWorkflowStatus,
  ) {
    if (!this.canTransitionProject(fromStatus, toStatus)) {
      throw new InvalidWorkflowTransitionError(fromStatus, toStatus);
    }
  }

  assertProjectSystemTransition(
    fromStatus: ProjectWorkflowStatus,
    toStatus: ProjectWorkflowStatus,
  ) {
    if (!PROJECT_SYSTEM_TRANSITIONS[fromStatus].includes(toStatus)) {
      throw new InvalidWorkflowTransitionError(fromStatus, toStatus);
    }
  }

  assertSectionTransition(
    fromStatus: SectionWorkflowStatus,
    toStatus: SectionWorkflowStatus,
  ) {
    if (!this.canTransitionSection(fromStatus, toStatus)) {
      throw new InvalidWorkflowTransitionError(fromStatus, toStatus);
    }
  }

  canSubmitProject(context: ProjectWorkflowPermissionContext) {
    return this.isOwnerOrAdmin(context);
  }

  canStartReview(context: ProjectWorkflowPermissionContext) {
    return (
      this.isAdmin(context) || context.project.reviewerId === context.actor.id
    );
  }

  canRequestChanges(context: ProjectWorkflowPermissionContext) {
    return (
      this.isAdmin(context) || context.project.reviewerId === context.actor.id
    );
  }

  canApproveProject(context: ProjectWorkflowPermissionContext) {
    return (
      this.isAdmin(context) || context.project.approverId === context.actor.id
    );
  }

  canArchiveProject(context: ProjectWorkflowPermissionContext) {
    return this.isOwnerOrAdmin(context);
  }

  canReviewSection(context: SectionWorkflowPermissionContext) {
    return (
      this.isAdmin(context) ||
      context.section.project.reviewerId === context.actor.id
    );
  }

  assertProjectPermission(
    action: ProjectPermissionAction,
    context: ProjectWorkflowPermissionContext,
  ) {
    const sameCompany =
      !context.project.companyId ||
      context.membership?.companyId === context.project.companyId;
    if (!sameCompany) {
      throw new UnauthorizedWorkflowActionError(action);
    }

    if (
      (action === 'SUBMIT' || action === 'ARCHIVE') &&
      !this.isOwnerOrAdmin(context)
    ) {
      throw new UnauthorizedWorkflowActionError(action);
    }
    if (
      (action === 'START_REVIEW' || action === 'REQUEST_CHANGES') &&
      !this.canStartReview(context)
    ) {
      throw new UnauthorizedWorkflowActionError(action);
    }
    if (action === 'APPROVE' && !this.canApproveProject(context)) {
      throw new UnauthorizedWorkflowActionError(action);
    }
    if (action === 'RESUBMIT' && !this.isOwnerOrAdmin(context)) {
      throw new UnauthorizedWorkflowActionError(action);
    }
  }

  assertSectionPermission(
    action: SectionPermissionAction,
    context: SectionWorkflowPermissionContext,
  ) {
    const sameCompany =
      !context.section.project.companyId ||
      context.membership?.companyId === context.section.project.companyId;
    if (!sameCompany) {
      throw new UnauthorizedWorkflowActionError(action);
    }

    if (action === 'COMPLETE' && !this.isSectionOwnerOrAdmin(context)) {
      throw new UnauthorizedWorkflowActionError(action);
    }
    if (
      (action === 'START_REVIEW' ||
        action === 'REQUEST_CHANGES' ||
        action === 'APPROVE') &&
      !this.canReviewSection(context)
    ) {
      throw new UnauthorizedWorkflowActionError(action);
    }
  }

  assertReviewerAssigned(project: { reviewerId: string | null }) {
    if (!project.reviewerId) {
      throw new ReviewerNotAssignedError();
    }
  }

  assertApproverAssigned(project: { approverId: string | null }) {
    if (!project.approverId) {
      throw new ApproverNotAssignedError();
    }
  }

  private isOwnerOrAdmin(context: ProjectWorkflowPermissionContext) {
    return (
      context.project.ownerId === context.actor.id || this.isAdmin(context)
    );
  }

  private isSectionOwnerOrAdmin(context: SectionWorkflowPermissionContext) {
    return (
      context.section.project.ownerId === context.actor.id ||
      this.isAdmin(context)
    );
  }

  private isAdmin(
    context:
      ProjectWorkflowPermissionContext | SectionWorkflowPermissionContext,
  ) {
    return (
      context.membership?.role === 'ADMIN' || context.actor.role === 'ADMIN'
    );
  }
}
