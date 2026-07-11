import {
  ProjectWorkflowAction,
  SectionWorkflowAction,
} from './workflow-action';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from './workflow-status';

export interface WorkflowActor {
  id: string;
  role?: string | null;
  companyId?: string | null;
}

export interface WorkflowMembership {
  companyId: string;
  role: string;
}

export interface ProjectWorkflowAggregate {
  id: string;
  name: string;
  companyId: string | null;
  ownerId: string;
  reviewerId: string | null;
  approverId: string | null;
  status: string;
  workflowStatus: ProjectWorkflowStatus;
  workflowVersion: number;
  sections: Array<{
    id: string;
    name: string;
    status: string;
    workflowStatus: SectionWorkflowStatus;
  }>;
}

export interface SectionWorkflowAggregate {
  id: string;
  name: string;
  projectId: string;
  status: string;
  workflowStatus: SectionWorkflowStatus;
  project: Pick<
    ProjectWorkflowAggregate,
    | 'id'
    | 'name'
    | 'companyId'
    | 'ownerId'
    | 'reviewerId'
    | 'approverId'
    | 'workflowStatus'
    | 'workflowVersion'
  >;
}

export interface WorkflowReadinessCheck {
  key: string;
  passed: boolean;
  message: string;
}

export interface WorkflowReadinessResult {
  ready: boolean;
  checks: WorkflowReadinessCheck[];
}

export interface ProjectWorkflowTransitionRequest {
  projectId: string;
  actorId: string;
  toStatus: ProjectWorkflowStatus;
  note?: string;
  signature?: string;
  expectedVersion?: number;
  reviewerId?: string;
  approverId?: string;
}

export interface SectionWorkflowTransitionRequest {
  sectionId: string;
  actorId: string;
  toStatus: SectionWorkflowStatus;
  note?: string;
  signature?: string;
}

export interface ProjectWorkflowHistoryEntry {
  id: string;
  createdAt: Date;
  actorId: string;
  actorEmail?: string;
  legacyStatus: string;
  workflowStatus: ProjectWorkflowStatus;
  note?: string | null;
  signature?: string | null;
}

export interface SectionWorkflowHistoryEntry {
  id: string;
  createdAt: Date;
  actorId: string;
  actorEmail?: string;
  legacyStatus: string;
  workflowStatus: SectionWorkflowStatus;
  note?: string | null;
  signature?: string | null;
}

export interface ProjectWorkflowPermissionContext {
  actor: WorkflowActor;
  membership: WorkflowMembership | null;
  project: ProjectWorkflowAggregate;
}

export interface SectionWorkflowPermissionContext {
  actor: WorkflowActor;
  membership: WorkflowMembership | null;
  section: SectionWorkflowAggregate;
}

export type ProjectPermissionAction =
  | 'SUBMIT'
  | 'START_REVIEW'
  | 'REQUEST_CHANGES'
  | 'RESUBMIT'
  | 'APPROVE'
  | 'ARCHIVE'
  | 'READINESS';

export type SectionPermissionAction =
  | 'COMPLETE'
  | 'START_REVIEW'
  | 'REQUEST_CHANGES'
  | 'APPROVE'
  | 'READINESS';
