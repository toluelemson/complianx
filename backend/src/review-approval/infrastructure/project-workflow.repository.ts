import {
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
  findMembership(userId: string, companyId: string): Promise<WorkflowMembership | null>;
  getProject(projectId: string): Promise<ProjectWorkflowAggregate | null>;
  transitionProject(request: ProjectWorkflowTransitionRequest): Promise<void>;
  listProjectHistory(projectId: string): Promise<ProjectWorkflowHistoryEntry[]>;
  listAssignedReviews(userId: string, companyId: string): Promise<any[]>;
}
