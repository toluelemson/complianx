export interface CreateAiSystemCommand {
  name: string;
  industry?: string;
  riskLevel?: string;
  description?: string;
  intendedUse?: string;
  deploymentGeography?: string;
  operatorRoles?: string[];
  sourcePublicResultId?: string;
}

export interface RequestAiSystemReviewCommand {
  reviewerId: string;
  message?: string;
  approverId?: string;
}
