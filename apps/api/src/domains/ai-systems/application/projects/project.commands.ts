export interface CreateAiSystemCommand {
  name: string;
  industry?: string;
  description?: string;
  businessPurpose?: string;
  intendedUse?: string;
  intendedUsers?: string;
  affectedPersons?: string;
  deploymentGeography?: string;
  operatorRoles?: string[];
  lifecycleStage?: string;
  responsibleOwner?: string;
  providerOrDeveloper?: string;
  deployerOrUser?: string;
  importer?: string;
  distributor?: string;
  authorizedRepresentative?: string;
  generatesContent?: boolean;
  useCaseIndicators?: string[];
  sourcePublicResultId?: string;
  dueDate?: string;
}

export interface RequestAiSystemReviewCommand {
  reviewerId: string;
  message?: string;
  approverId?: string;
}
