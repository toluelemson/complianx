export type ProjectAccessRole = 'OWNER' | 'REVIEWER' | 'APPROVER' | 'MEMBER';

export interface ProjectAccessOptions {
  allowReviewer?: boolean;
  allowApprover?: boolean;
  allowOwner?: boolean;
  allowCompanyMember?: boolean;
}
