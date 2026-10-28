import { ProjectReadinessService } from './project-readiness.service';
import {
  SectionWorkflowStatus,
  ProjectWorkflowStatus,
} from '../domain/workflow-status';

describe('ProjectReadinessService approval readiness', () => {
  const blockingComments = {
    checkProject: jest.fn().mockResolvedValue({
      key: 'blocking_comments',
      passed: true,
      message: 'No blocking comments',
    }),
  };
  const service = new ProjectReadinessService(blockingComments);
  const project = (statuses: SectionWorkflowStatus[]) => ({
    id: 'project-1',
    name: 'Test',
    companyId: null,
    ownerId: 'owner',
    reviewerId: 'reviewer',
    approverId: 'approver',
    workflowStatus: ProjectWorkflowStatus.IN_REVIEW,
    workflowVersion: 1,
    sections: statuses.map((workflowStatus, index) => ({
      id: `section-${index}`,
      name: `Section ${index}`,
      workflowStatus,
    })),
  });

  it.each(
    [
      [SectionWorkflowStatus.APPROVED],
      [SectionWorkflowStatus.APPROVED, SectionWorkflowStatus.APPROVED],
    ].map((statuses) => [statuses]),
  )('passes when every section is approved', async (statuses) => {
    await expect(
      service.assertReadyForApproval(project(statuses)),
    ).resolves.toBeUndefined();
  });

  it.each(
    [
      [SectionWorkflowStatus.COMPLETE],
      [SectionWorkflowStatus.IN_REVIEW],
      [SectionWorkflowStatus.APPROVED, SectionWorkflowStatus.IN_REVIEW],
      [],
    ].map((statuses) => [statuses]),
  )('blocks when sections are not all approved', async (statuses) => {
    await expect(
      service.assertReadyForApproval(project(statuses)),
    ).rejects.toThrow(
      statuses.length
        ? 'All required sections must be approved before project approval'
        : 'At least one required section must exist and be approved before project approval',
    );
  });

  it('blocks when comments are unresolved', async () => {
    blockingComments.checkProject.mockResolvedValueOnce({
      key: 'blocking_comments',
      passed: false,
      message: 'Blocking comments must be resolved first',
    });
    await expect(
      service.assertReadyForApproval(project([SectionWorkflowStatus.APPROVED])),
    ).rejects.toThrow('Blocking comments must be resolved first');
  });

  it('does not block submission because of an extra evidence section', async () => {
    const requiredContent = {
      system_overview: {
        purpose: 'Help staff',
        intendedUsers: 'Support staff',
        deploymentContext: 'Internal tool',
      },
      model_info: {
        modelType: 'Classifier',
        trainingData: 'Reviewed data',
        metrics: 'Accuracy',
      },
      data_governance: {
        dataSources: 'Customer records',
        qualityChecks: 'Monthly checks',
        privacy: 'Access controls',
      },
      risk_assessment: {
        risks: 'Incorrect advice',
        likelihood: 'Low',
        impact: 'Medium',
      },
      human_oversight: {
        roles: 'Support lead',
        escalations: 'Escalate urgent cases',
      },
      monitoring: {
        monitoringPlan: 'Weekly review',
        maintenance: 'Monthly updates',
      },
    };
    const submissionProject = {
      ...project([SectionWorkflowStatus.APPROVED]),
      sections: [
        ...Object.entries(requiredContent).map(([name, content]) => ({
          id: name,
          name,
          content,
          workflowStatus: SectionWorkflowStatus.DRAFT,
        })),
        {
          id: 'evidence',
          name: 'Evidence',
          content: null,
          workflowStatus: SectionWorkflowStatus.DRAFT,
        },
      ],
    };

    await expect(
      service.assertReadyForSubmission(submissionProject),
    ).resolves.toBeUndefined();
  });
});
