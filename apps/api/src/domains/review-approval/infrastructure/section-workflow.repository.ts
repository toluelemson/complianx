import {
  SectionWorkflowAggregate,
  SectionWorkflowHistoryEntry,
  SectionWorkflowTransitionRequest,
  WorkflowActor,
  WorkflowMembership,
} from '../domain/workflow.types';

export const SECTION_WORKFLOW_REPOSITORY = Symbol(
  'SECTION_WORKFLOW_REPOSITORY',
);

export interface SectionWorkflowRepository {
  findActor(actorId: string): Promise<WorkflowActor | null>;
  findMembership(
    userId: string,
    companyId: string,
  ): Promise<WorkflowMembership | null>;
  getSection(sectionId: string): Promise<SectionWorkflowAggregate | null>;
  transitionSection(request: SectionWorkflowTransitionRequest): Promise<void>;
  listSectionHistory(sectionId: string): Promise<SectionWorkflowHistoryEntry[]>;
}
