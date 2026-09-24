import { StartProjectReviewUseCase } from './start-project-review.use-case';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';

describe('StartProjectReviewUseCase', () => {
  it('starts review without re-checking form fields that were checked at submission', async () => {
    const project = {
      id: 'project-1',
      name: 'AI case',
      companyId: 'company-1',
      ownerId: 'owner-1',
      reviewerId: 'reviewer-1',
      approverId: null,
      workflowStatus: ProjectWorkflowStatus.READY_FOR_REVIEW,
      workflowVersion: 2,
      // The transition is intentionally independent of the section content.
      // Submission and resubmission own readiness validation.
      sections: [],
    };
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'reviewer-1', companyId: 'company-1' },
        membership: { companyId: 'company-1', role: 'REVIEWER' },
        project,
      }),
    } as unknown as WorkflowContextService;
    const repository = {
      transitionProject: jest.fn().mockResolvedValue(undefined),
      getProject: jest.fn().mockResolvedValue({
        ...project,
        workflowStatus: ProjectWorkflowStatus.IN_REVIEW,
      }),
    };
    const sideEffects = {
      onProjectTransition: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowSideEffectsService;

    const useCase = new StartProjectReviewUseCase(
      context,
      new WorkflowPolicyService(),
      sideEffects,
      repository as never,
    );

    await useCase.execute({
      projectId: project.id,
      actorId: 'reviewer-1',
      expectedVersion: project.workflowVersion,
    });

    expect(repository.transitionProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: project.id,
        toStatus: ProjectWorkflowStatus.IN_REVIEW,
        expectedVersion: project.workflowVersion,
      }),
    );
  });
});
