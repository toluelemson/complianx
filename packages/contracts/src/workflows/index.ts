export type WorkflowActorContract = 'OWNER' | 'REVIEWER' | 'APPROVER';

export interface WorkflowActionContract {
  action: string;
  reason?: string;
}
