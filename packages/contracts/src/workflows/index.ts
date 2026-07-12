export type WorkflowActorContract =
  | 'OWNER'
  | 'REVIEWER'
  | 'APPROVER'
  | 'MEMBER';

export interface WorkflowActionContract {
  action: string;
  reason?: string;
}
