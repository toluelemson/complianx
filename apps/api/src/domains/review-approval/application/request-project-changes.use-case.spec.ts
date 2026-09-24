import { RequestProjectChangesUseCase } from './request-project-changes.use-case';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';

describe('RequestProjectChangesUseCase', () => {
  const project = {
    id: 'project-1',
    name: 'AI case',
    companyId: 'company-1',
    ownerId: 'owner-1',
    reviewerId: 'reviewer-1',
    approverId: null,
    workflowStatus: ProjectWorkflowStatus.IN_REVIEW,
    workflowVersion: 3,
    sections: [],
  };

  it('records a reviewer note when changes are requested', async () => {
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
        workflowStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
      }),
    };
    const sideEffects = {
      onProjectTransition: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowSideEffectsService;
    const useCase = new RequestProjectChangesUseCase(
      context,
      new WorkflowPolicyService(),
      sideEffects,
      repository as never,
    );

    await useCase.execute({
      projectId: project.id,
      actorId: 'reviewer-1',
      note: 'Please add the missing evaluation report.',
    });

    expect(repository.transitionProject).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
        note: 'Please add the missing evaluation report.',
      }),
    );
  });

  it('requires a reason for the owner to act on', async () => {
    const useCase = new RequestProjectChangesUseCase(
      {} as WorkflowContextService,
      new WorkflowPolicyService(),
      {} as WorkflowSideEffectsService,
      {} as never,
    );

    await expect(
      useCase.execute({ projectId: project.id, actorId: 'reviewer-1', note: ' ' }),
    ).rejects.toThrow('Add a note explaining what needs to change.');
  });
});
