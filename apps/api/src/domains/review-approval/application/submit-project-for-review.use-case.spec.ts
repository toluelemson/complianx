import { SubmitProjectForReviewUseCase } from './submit-project-for-review.use-case';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { ProjectReadinessService } from './project-readiness.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { WorkflowContextService } from './workflow-context.service';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from '../domain/workflow-status';

describe('SubmitProjectForReviewUseCase', () => {
  const project = {
    id: 'project-1',
    name: 'AI Case',
    companyId: 'company-1',
    ownerId: 'owner-1',
    reviewerId: 'reviewer-1',
    approverId: 'approver-1',
    status: 'DRAFT',
    workflowStatus: ProjectWorkflowStatus.DRAFT,
    workflowVersion: 2,
    sections: [
      {
        id: 'section-1',
        name: 'Overview',
        status: 'DRAFT',
        workflowStatus: SectionWorkflowStatus.COMPLETE,
      },
    ],
  };

  it('transitions a ready project into READY_FOR_REVIEW', async () => {
    const repository = {
      transitionProject: jest.fn().mockResolvedValue(undefined),
      getProject: jest.fn().mockResolvedValue({
        ...project,
        workflowStatus: ProjectWorkflowStatus.READY_FOR_REVIEW,
      }),
    };
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'owner-1', role: 'USER', companyId: 'company-1' },
        membership: { companyId: 'company-1', role: 'USER' },
        project,
      }),
    } as unknown as WorkflowContextService;
    const policy = new WorkflowPolicyService();
    const readiness = {
      assertReadyForSubmission: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectReadinessService;
    const sideEffects = {
      onProjectTransition: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowSideEffectsService;

    const useCase = new SubmitProjectForReviewUseCase(
      context,
      policy,
      readiness,
      sideEffects,
      repository as any,
    );

    const result = await useCase.execute({
      projectId: 'project-1',
      actorId: 'owner-1',
      expectedVersion: 2,
    });

    expect(result).not.toBeNull();
    expect(repository.transitionProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        actorId: 'owner-1',
        toStatus: ProjectWorkflowStatus.READY_FOR_REVIEW,
        expectedVersion: 2,
      }),
    );
    expect(result!.workflowStatus).toBe(ProjectWorkflowStatus.READY_FOR_REVIEW);
  });
});
