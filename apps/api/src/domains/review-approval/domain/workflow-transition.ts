import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from './workflow-status';

export const PROJECT_TRANSITIONS: Record<
  ProjectWorkflowStatus,
  ProjectWorkflowStatus[]
> = {
  [ProjectWorkflowStatus.DRAFT]: [
    ProjectWorkflowStatus.READY_FOR_REVIEW,
    ProjectWorkflowStatus.CANCELLED,
  ],
  [ProjectWorkflowStatus.READY_FOR_REVIEW]: [
    ProjectWorkflowStatus.DRAFT,
    ProjectWorkflowStatus.IN_REVIEW,
    ProjectWorkflowStatus.CANCELLED,
  ],
  [ProjectWorkflowStatus.IN_REVIEW]: [
    ProjectWorkflowStatus.CHANGES_REQUESTED,
    ProjectWorkflowStatus.APPROVED,
    ProjectWorkflowStatus.REJECTED,
  ],
  [ProjectWorkflowStatus.CHANGES_REQUESTED]: [
    ProjectWorkflowStatus.RESUBMITTED,
    ProjectWorkflowStatus.CANCELLED,
  ],
  [ProjectWorkflowStatus.RESUBMITTED]: [ProjectWorkflowStatus.IN_REVIEW],
  [ProjectWorkflowStatus.APPROVED]: [ProjectWorkflowStatus.ARCHIVED],
  [ProjectWorkflowStatus.ARCHIVED]: [],
  [ProjectWorkflowStatus.REJECTED]: [],
  [ProjectWorkflowStatus.CANCELLED]: [],
};

// Internal compatibility transitions used while legacy edit flows are still
// present. These are explicit system transitions, not user-facing review steps.
export const PROJECT_SYSTEM_TRANSITIONS: Record<
  ProjectWorkflowStatus,
  ProjectWorkflowStatus[]
> = {
  [ProjectWorkflowStatus.DRAFT]: [],
  [ProjectWorkflowStatus.READY_FOR_REVIEW]: [],
  [ProjectWorkflowStatus.IN_REVIEW]: [ProjectWorkflowStatus.CHANGES_REQUESTED],
  [ProjectWorkflowStatus.CHANGES_REQUESTED]: [],
  [ProjectWorkflowStatus.RESUBMITTED]: [],
  [ProjectWorkflowStatus.APPROVED]: [ProjectWorkflowStatus.CHANGES_REQUESTED],
  [ProjectWorkflowStatus.ARCHIVED]: [],
  [ProjectWorkflowStatus.REJECTED]: [],
  [ProjectWorkflowStatus.CANCELLED]: [],
};

export const SECTION_TRANSITIONS: Record<
  SectionWorkflowStatus,
  SectionWorkflowStatus[]
> = {
  [SectionWorkflowStatus.DRAFT]: [
    SectionWorkflowStatus.COMPLETE,
    SectionWorkflowStatus.IN_REVIEW,
  ],
  [SectionWorkflowStatus.COMPLETE]: [SectionWorkflowStatus.IN_REVIEW],
  [SectionWorkflowStatus.IN_REVIEW]: [
    SectionWorkflowStatus.CHANGES_REQUESTED,
    SectionWorkflowStatus.APPROVED,
  ],
  [SectionWorkflowStatus.CHANGES_REQUESTED]: [
    SectionWorkflowStatus.COMPLETE,
    SectionWorkflowStatus.IN_REVIEW,
  ],
  [SectionWorkflowStatus.APPROVED]: [],
};
