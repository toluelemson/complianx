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

// Compatibility mapping to the legacy persisted status columns. Some workflow
// states collapse to the same legacy value until old status enums are retired.
export function mapProjectWorkflowToLegacyStatus(
  status: ProjectWorkflowStatus,
): 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' {
  switch (status) {
    case ProjectWorkflowStatus.DRAFT:
    case ProjectWorkflowStatus.READY_FOR_REVIEW:
    case ProjectWorkflowStatus.CANCELLED:
      return 'DRAFT';
    case ProjectWorkflowStatus.IN_REVIEW:
    case ProjectWorkflowStatus.RESUBMITTED:
      return 'IN_REVIEW';
    case ProjectWorkflowStatus.CHANGES_REQUESTED:
    case ProjectWorkflowStatus.REJECTED:
      return 'CHANGES_REQUESTED';
    case ProjectWorkflowStatus.APPROVED:
    case ProjectWorkflowStatus.ARCHIVED:
      return 'APPROVED';
  }
}

export function mapSectionWorkflowToLegacyStatus(
  status: SectionWorkflowStatus,
): 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' {
  switch (status) {
    case SectionWorkflowStatus.DRAFT:
    case SectionWorkflowStatus.COMPLETE:
      return 'DRAFT';
    case SectionWorkflowStatus.IN_REVIEW:
      return 'IN_REVIEW';
    case SectionWorkflowStatus.CHANGES_REQUESTED:
      return 'CHANGES_REQUESTED';
    case SectionWorkflowStatus.APPROVED:
      return 'APPROVED';
  }
}

export function inferProjectWorkflowFromLegacyStatus(
  status: string,
): ProjectWorkflowStatus {
  switch (status) {
    case 'IN_REVIEW':
      return ProjectWorkflowStatus.IN_REVIEW;
    case 'CHANGES_REQUESTED':
      return ProjectWorkflowStatus.CHANGES_REQUESTED;
    case 'APPROVED':
      return ProjectWorkflowStatus.APPROVED;
    default:
      return ProjectWorkflowStatus.DRAFT;
  }
}

export function inferSectionWorkflowFromLegacyStatus(
  status: string,
): SectionWorkflowStatus {
  switch (status) {
    case 'IN_REVIEW':
      return SectionWorkflowStatus.IN_REVIEW;
    case 'CHANGES_REQUESTED':
      return SectionWorkflowStatus.CHANGES_REQUESTED;
    case 'APPROVED':
      return SectionWorkflowStatus.APPROVED;
    default:
      return SectionWorkflowStatus.DRAFT;
  }
}
