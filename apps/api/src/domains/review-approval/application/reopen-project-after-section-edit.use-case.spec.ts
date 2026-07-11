import { ReopenProjectAfterSectionEditUseCase } from './reopen-project-after-section-edit.use-case';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from '../domain/workflow-status';
import { InvalidWorkflowTransitionError } from '../domain/workflow-errors';

describe('ReopenProjectAfterSectionEditUseCase', () => {
  const baseProject = {
    id: 'project-1',
    name: 'Assessment',
    companyId: 'company-1',
    ownerId: 'owner-1',
    reviewerId: 'reviewer-1',
    approverId: 'approver-1',
    status: 'APPROVED',
    workflowStatus: ProjectWorkflowStatus.APPROVED,
    workflowVersion: 4,
    sections: [
      {
        id: 'section-1',
        name: 'Overview',
        status: 'APPROVED',
        workflowStatus: SectionWorkflowStatus.APPROVED,
      },
    ],
  };

  it('reopens an approved project after a section edit', async () => {
    const repository = {
      transitionProject: jest.fn().mockResolvedValue(undefined),
      getProject: jest.fn().mockResolvedValue({
        ...baseProject,
        workflowStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
      }),
    };
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'owner-1', role: 'USER', companyId: 'company-1' },
        membership: { companyId: 'company-1', role: 'USER' },
        project: baseProject,
      }),
    } as unknown as WorkflowContextService;
    const sideEffects = {
      onProjectTransition: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowSideEffectsService;

    const useCase = new ReopenProjectAfterSectionEditUseCase(
      context,
      new WorkflowPolicyService(),
      sideEffects,
      repository as any,
    );

    const result = await useCase.execute({
      projectId: 'project-1',
      actorId: 'owner-1',
    });

    expect(repository.transitionProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        toStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
        expectedVersion: 4,
      }),
    );
    expect(result.workflowStatus).toBe(ProjectWorkflowStatus.CHANGES_REQUESTED);
  });

  it('rejects reopening from draft', async () => {
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'owner-1', role: 'USER', companyId: 'company-1' },
        membership: { companyId: 'company-1', role: 'USER' },
        project: {
          ...baseProject,
          workflowStatus: ProjectWorkflowStatus.DRAFT,
          workflowVersion: 1,
        },
      }),
    } as unknown as WorkflowContextService;

    const useCase = new ReopenProjectAfterSectionEditUseCase(
      context,
      new WorkflowPolicyService(),
      { onProjectTransition: jest.fn() } as any,
      { transitionProject: jest.fn(), getProject: jest.fn() } as any,
    );

    await expect(
      useCase.execute({
        projectId: 'project-1',
        actorId: 'owner-1',
      }),
    ).rejects.toThrow(InvalidWorkflowTransitionError);
  });
});
