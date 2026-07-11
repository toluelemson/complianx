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
export class ResubmitProjectUseCase {
  constructor(
    private readonly context: WorkflowContextService,
    private readonly policy: WorkflowPolicyService,
    private readonly readiness: ProjectReadinessService,
    private readonly sideEffects: WorkflowSideEffectsService,
    @Inject(PROJECT_WORKFLOW_REPOSITORY)
    private readonly projects: ProjectWorkflowRepository,
  ) {}

  async execute(params: { projectId: string; actorId: string; note?: string; expectedVersion?: number }) {
    const context = await this.context.loadProjectContext(params.projectId, params.actorId);
    this.policy.assertProjectPermission('RESUBMIT', context);
    this.policy.assertProjectTransition(
      context.project.workflowStatus,
      ProjectWorkflowStatus.RESUBMITTED,
    );
    await this.readiness.assertReadyForSubmission(context.project);
    await this.projects.transitionProject({
      projectId: params.projectId,
      actorId: params.actorId,
      toStatus: ProjectWorkflowStatus.RESUBMITTED,
      expectedVersion: params.expectedVersion ?? context.project.workflowVersion,
      note: params.note,
    });
    await this.sideEffects.onProjectTransition({
      project: context.project,
      toStatus: ProjectWorkflowStatus.RESUBMITTED,
      actorId: params.actorId,
      note: params.note,
    });
    return this.projects.getProject(params.projectId);
  }
}
