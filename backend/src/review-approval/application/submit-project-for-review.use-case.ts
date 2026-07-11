import { Inject, Injectable } from '@nestjs/common';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { ProjectReadinessService } from './project-readiness.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';
import {
  PROJECT_WORKFLOW_REPOSITORY,
  ProjectWorkflowRepository,
} from '../infrastructure/project-workflow.repository';

@Injectable()
export class SubmitProjectForReviewUseCase {
  constructor(
    private readonly context: WorkflowContextService,
    private readonly policy: WorkflowPolicyService,
    private readonly readiness: ProjectReadinessService,
    private readonly sideEffects: WorkflowSideEffectsService,
    @Inject(PROJECT_WORKFLOW_REPOSITORY)
    private readonly projects: ProjectWorkflowRepository,
  ) {}

  async execute(params: {
    projectId: string;
    actorId: string;
    expectedVersion?: number;
    reviewerId?: string;
    approverId?: string;
    note?: string;
  }) {
    const context = await this.context.loadProjectContext(
      params.projectId,
      params.actorId,
    );
    this.policy.assertProjectPermission('SUBMIT', context);
    this.policy.assertProjectTransition(
      context.project.workflowStatus,
      ProjectWorkflowStatus.READY_FOR_REVIEW,
    );
    const reviewerId = params.reviewerId ?? context.project.reviewerId;
    if (!reviewerId) {
      this.policy.assertReviewerAssigned({ reviewerId });
    }
    await this.readiness.assertReadyForSubmission({
      ...context.project,
      reviewerId,
      approverId: params.approverId ?? context.project.approverId,
    });
    await this.projects.transitionProject({
      projectId: params.projectId,
      actorId: params.actorId,
      toStatus: ProjectWorkflowStatus.READY_FOR_REVIEW,
      expectedVersion: params.expectedVersion ?? context.project.workflowVersion,
      reviewerId: reviewerId ?? undefined,
      approverId: params.approverId ?? context.project.approverId ?? undefined,
      note: params.note,
    });
    await this.sideEffects.onProjectTransition({
      project: { ...context.project, reviewerId },
      toStatus: ProjectWorkflowStatus.READY_FOR_REVIEW,
      actorId: params.actorId,
      note: params.note,
    });
    return this.projects.getProject(params.projectId);
  }
}
