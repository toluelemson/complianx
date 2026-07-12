import {
  AssignedProjectReview,
  ProjectWorkflowAggregate,
  ProjectWorkflowHistoryEntry,
  ProjectWorkflowTransitionRequest,
  WorkflowActor,
  WorkflowMembership,
} from '../domain/workflow.types';

export const PROJECT_WORKFLOW_REPOSITORY = Symbol(
  'PROJECT_WORKFLOW_REPOSITORY',
);

export interface ProjectWorkflowRepository {
  findActor(actorId: string): Promise<WorkflowActor | null>;
  findMembership(
    userId: string,
    companyId: string,
  ): Promise<WorkflowMembership | null>;
  getProject(projectId: string): Promise<ProjectWorkflowAggregate | null>;
  listReviewerCandidates(
    companyId: string,
    actorId: string,
  ): Promise<Array<{ id: string; email: string; role: string }>>;
  getProjectApprovalSnapshot(projectId: string): Promise<{
    id: string;
    name: string;
    companyId: string | null;
    approverId: string | null;
    approverEmail: string | null;
    workflowStatus: import('../domain/workflow-status').ProjectWorkflowStatus;
    allSectionsApproved: boolean;
  } | null>;
  transitionProject(request: ProjectWorkflowTransitionRequest): Promise<void>;
  listProjectHistory(projectId: string): Promise<ProjectWorkflowHistoryEntry[]>;
  listAssignedReviews(
    userId: string,
    companyId: string,
  ): Promise<AssignedProjectReview[]>;
}
