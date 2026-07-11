import { Inject, Injectable } from '@nestjs/common';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { ProjectReadinessService } from './project-readiness.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';
import { IncompleteAssessmentError } from '../domain/workflow-errors';
import {
  PROJECT_WORKFLOW_REPOSITORY,
  ProjectWorkflowRepository,
} from '../infrastructure/project-workflow.repository';

@Injectable()
export class ApproveProjectUseCase {
  constructor(
    private readonly context: WorkflowContextService,
    private readonly policy: WorkflowPolicyService,
    private readonly readiness: ProjectReadinessService,
    private readonly sideEffects: WorkflowSideEffectsService,
    @Inject(PROJECT_WORKFLOW_REPOSITORY)
    private readonly projects: ProjectWorkflowRepository,
  ) {}

  async execute(params: { projectId: string; actorId: string; signature?: string; note?: string; expectedVersion?: number }) {
    if (!params.signature?.trim()) {
      throw new IncompleteAssessmentError('Signature is required to approve');
    }
    const context = await this.context.loadProjectContext(params.projectId, params.actorId);
    this.policy.assertProjectPermission('APPROVE', context);
    this.policy.assertApproverAssigned(context.project);
    this.policy.assertProjectTransition(
      context.project.workflowStatus,
      ProjectWorkflowStatus.APPROVED,
    );
    await this.readiness.assertReadyForApproval(context.project);
    await this.projects.transitionProject({
      projectId: params.projectId,
      actorId: params.actorId,
      toStatus: ProjectWorkflowStatus.APPROVED,
      expectedVersion: params.expectedVersion ?? context.project.workflowVersion,
      note: params.note,
      signature: params.signature,
    });
    await this.sideEffects.onProjectTransition({
      project: context.project,
      toStatus: ProjectWorkflowStatus.APPROVED,
      actorId: params.actorId,
      note: params.note,
    });
    return this.projects.getProject(params.projectId);
  }
}
