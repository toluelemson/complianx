import { WorkflowPolicyService } from './workflow-policy.service';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from './workflow-status';
import { InvalidWorkflowTransitionError } from './workflow-errors';

describe('WorkflowPolicyService', () => {
  let service: WorkflowPolicyService;

  beforeEach(() => {
    service = new WorkflowPolicyService();
  });

  it('allows valid project transitions', () => {
    expect(
      service.canTransitionProject(
        ProjectWorkflowStatus.DRAFT,
        ProjectWorkflowStatus.READY_FOR_REVIEW,
      ),
    ).toBe(true);
    expect(
      service.canTransitionProject(
        ProjectWorkflowStatus.CHANGES_REQUESTED,
        ProjectWorkflowStatus.RESUBMITTED,
      ),
    ).toBe(true);
  });

  it('rejects invalid project transitions', () => {
    expect(() =>
      service.assertProjectTransition(
        ProjectWorkflowStatus.DRAFT,
        ProjectWorkflowStatus.APPROVED,
      ),
    ).toThrow(InvalidWorkflowTransitionError);
  });

  it('allows valid section transitions', () => {
    expect(
      service.canTransitionSection(
        SectionWorkflowStatus.COMPLETE,
        SectionWorkflowStatus.IN_REVIEW,
      ),
    ).toBe(true);
  });

  it('rejects invalid section transitions', () => {
    expect(() =>
      service.assertSectionTransition(
        SectionWorkflowStatus.DRAFT,
        SectionWorkflowStatus.APPROVED,
      ),
    ).toThrow(InvalidWorkflowTransitionError);
  });
});
