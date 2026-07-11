export interface CreateAiSystemCommand {
  name: string;
  industry?: string;
  riskLevel?: string;
}

export interface RequestAiSystemReviewCommand {
  reviewerId: string;
  message?: string;
  approverId?: string;
}
