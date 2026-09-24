import { ResubmitProjectUseCase } from './resubmit-project.use-case';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { ProjectReadinessService } from './project-readiness.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';

describe('ResubmitProjectUseCase', () => {
  it('lets the project owner resubmit work once it is ready again', async () => {
    const project = {
      id: 'project-1',
      name: 'AI case',
      companyId: 'company-1',
      ownerId: 'owner-1',
      reviewerId: 'reviewer-1',
      approverId: null,
      workflowStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
      workflowVersion: 4,
      sections: [],
    };
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'owner-1', companyId: 'company-1' },
        membership: { companyId: 'company-1', role: 'USER' },
        project,
      }),
    } as unknown as WorkflowContextService;
    const readiness = {
      assertReadyForSubmission: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectReadinessService;
    const repository = {
      transitionProject: jest.fn().mockResolvedValue(undefined),
      getProject: jest.fn().mockResolvedValue({
        ...project,
        workflowStatus: ProjectWorkflowStatus.RESUBMITTED,
      }),
    };
    const sideEffects = {
      onProjectTransition: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowSideEffectsService;
    const useCase = new ResubmitProjectUseCase(
      context,
      new WorkflowPolicyService(),
      readiness,
      sideEffects,
      repository as never,
    );

    await useCase.execute({ projectId: project.id, actorId: 'owner-1' });

    expect(readiness.assertReadyForSubmission).toHaveBeenCalledWith(project);
    expect(repository.transitionProject).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: ProjectWorkflowStatus.RESUBMITTED,
        expectedVersion: project.workflowVersion,
      }),
    );
  });
});
