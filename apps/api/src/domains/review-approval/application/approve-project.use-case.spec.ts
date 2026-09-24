import { ApproveProjectUseCase } from './approve-project.use-case';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { ProjectReadinessService } from './project-readiness.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { ProjectWorkflowStatus } from '../domain/workflow-status';

describe('ApproveProjectUseCase', () => {
  const project = {
    id: 'project-1',
    name: 'AI case',
    companyId: 'company-1',
    ownerId: 'owner-1',
    reviewerId: 'reviewer-1',
    approverId: 'approver-1',
    workflowStatus: ProjectWorkflowStatus.IN_REVIEW,
    workflowVersion: 5,
    sections: [],
  };

  it('records approval from the assigned approver with their confirmation', async () => {
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'approver-1', companyId: 'company-1' },
        membership: { companyId: 'company-1', role: 'USER' },
        project,
      }),
    } as unknown as WorkflowContextService;
    const readiness = {
      assertReadyForApproval: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectReadinessService;
    const repository = {
      transitionProject: jest.fn().mockResolvedValue(undefined),
      getProject: jest.fn().mockResolvedValue({
        ...project,
        workflowStatus: ProjectWorkflowStatus.APPROVED,
      }),
    };
    const sideEffects = {
      onProjectTransition: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowSideEffectsService;
    const useCase = new ApproveProjectUseCase(
      context,
      new WorkflowPolicyService(),
      readiness,
      sideEffects,
      repository as never,
    );

    await useCase.execute({
      projectId: project.id,
      actorId: 'approver-1',
      signature: 'Ada Approver',
    });

    expect(readiness.assertReadyForApproval).toHaveBeenCalledWith(project);
    expect(repository.transitionProject).toHaveBeenCalledWith(
      expect.objectContaining({
        toStatus: ProjectWorkflowStatus.APPROVED,
        signature: 'Ada Approver',
      }),
    );
  });

  it('requires a confirmation signature before changing the project', async () => {
    const useCase = new ApproveProjectUseCase(
      {} as WorkflowContextService,
      new WorkflowPolicyService(),
      {} as ProjectReadinessService,
      {} as WorkflowSideEffectsService,
      {} as never,
    );

    await expect(
      useCase.execute({ projectId: project.id, actorId: 'approver-1' }),
    ).rejects.toThrow('Enter your name to confirm approval.');
  });

  it('allows a company administrator to approve without assigning a separate approver', async () => {
    const adminProject = { ...project, approverId: null };
    const context = {
      loadProjectContext: jest.fn().mockResolvedValue({
        actor: { id: 'admin-1', companyId: 'company-1', role: 'ADMIN' },
        membership: { companyId: 'company-1', role: 'ADMIN' },
        project: adminProject,
      }),
    } as unknown as WorkflowContextService;
    const readiness = {
      assertReadyForApproval: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProjectReadinessService;
    const repository = {
      transitionProject: jest.fn().mockResolvedValue(undefined),
      getProject: jest.fn().mockResolvedValue({
        ...adminProject,
        workflowStatus: ProjectWorkflowStatus.APPROVED,
      }),
    };
    const useCase = new ApproveProjectUseCase(
      context,
      new WorkflowPolicyService(),
      readiness,
      { onProjectTransition: jest.fn() } as unknown as WorkflowSideEffectsService,
      repository as never,
    );

    await expect(
      useCase.execute({
        projectId: adminProject.id,
        actorId: 'admin-1',
        signature: 'Project administrator',
      }),
    ).resolves.toEqual(expect.objectContaining({ workflowStatus: 'APPROVED' }));
  });
});
