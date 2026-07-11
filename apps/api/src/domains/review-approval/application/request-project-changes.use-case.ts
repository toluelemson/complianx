import { Inject, Injectable } from '@nestjs/common';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';
import { IncompleteAssessmentError } from '../domain/workflow-errors';
import {
  PROJECT_WORKFLOW_REPOSITORY,
  ProjectWorkflowRepository,
} from '../infrastructure/project-workflow.repository';

@Injectable()
export class RequestProjectChangesUseCase {
  constructor(
    private readonly context: WorkflowContextService,
    private readonly policy: WorkflowPolicyService,
    private readonly sideEffects: WorkflowSideEffectsService,
    @Inject(PROJECT_WORKFLOW_REPOSITORY)
    private readonly projects: ProjectWorkflowRepository,
  ) {}

  async execute(params: {
    projectId: string;
    actorId: string;
    note: string;
    expectedVersion?: number;
  }) {
    if (!params.note?.trim()) {
      throw new IncompleteAssessmentError(
        'Reason is required when requesting changes',
      );
    }
    const context = await this.context.loadProjectContext(
      params.projectId,
      params.actorId,
    );
    this.policy.assertProjectPermission('REQUEST_CHANGES', context);
    this.policy.assertProjectTransition(
      context.project.workflowStatus,
      ProjectWorkflowStatus.CHANGES_REQUESTED,
    );
    await this.projects.transitionProject({
      projectId: params.projectId,
      actorId: params.actorId,
      toStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
      expectedVersion:
        params.expectedVersion ?? context.project.workflowVersion,
      note: params.note,
    });
    await this.sideEffects.onProjectTransition({
      project: context.project,
      toStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
      actorId: params.actorId,
      note: params.note,
    });
    return this.projects.getProject(params.projectId);
  }
}
