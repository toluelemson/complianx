export type ArtifactStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type UserRef = {
  id: string;
  email: string;
};

export type RoleUserRef = UserRef & {
  role: string;
};

export type SectionComment = {
  id: string;
  body: string;
  createdAt: string;
  author?: UserRef;
};

export type StatusEvent = {
  id: string;
  status:
    | 'DRAFT'
    | 'COMPLETE'
    | 'READY_FOR_REVIEW'
    | 'IN_REVIEW'
    | 'CHANGES_REQUESTED'
    | 'RESUBMITTED'
    | 'APPROVED'
    | 'ARCHIVED'
    | 'REJECTED'
    | 'CANCELLED';
  note?: string;
  signature?: string;
  createdAt: string;
  actor?: UserRef;
};

export type SectionArtifactItem = {
  id: string;
  originalName: string;
  description?: string | null;
  createdAt: string;
  size: number;
  mimeType: string;
  version: number;
  checksum: string;
  citationKey: string;
  status: ArtifactStatus;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  uploadedBy?: UserRef;
  reviewedBy?: UserRef | null;
  previousArtifact?: {
    id: string;
    version: number;
    checksum: string;
    citationKey: string;
  } | null;
};

export type SectionWithMeta = {
  id: string;
  name: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastEditor?: UserRef;
  comments: SectionComment[];
  workflowStatus:
    | 'DRAFT'
    | 'COMPLETE'
    | 'IN_REVIEW'
    | 'CHANGES_REQUESTED'
    | 'APPROVED';
  statusEvents?: StatusEvent[];
  artifacts?: SectionArtifactItem[];
};

export type ProjectWorkflowStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'ARCHIVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ProjectDetail = {
  id: string;
  name: string;
  industry?: string | null;
  riskLevel?: string | null;
  description?: string | null;
  businessPurpose?: string | null;
  intendedUse?: string | null;
  intendedUsers?: string | null;
  affectedPersons?: string | null;
  deploymentGeography?: string | null;
  operatorRoles?: string[];
  lifecycleStage?: string | null;
  responsibleOwner?: string | null;
  providerOrDeveloper?: string | null;
  deployerOrUser?: string | null;
  importer?: string | null;
  distributor?: string | null;
  authorizedRepresentative?: string | null;
  generatesContent?: boolean | null;
  useCaseIndicators?: string[];
  sourcePublicResultId?: string | null;
  createdAt: string;
  updatedAt?: string;
  companyId?: string | null;
  reviewerId?: string | null;
  approverId?: string | null;
  workflowStatus?: ProjectWorkflowStatus;
  workflowVersion?: number;
  viewerRole?: 'OWNER' | 'REVIEWER' | 'APPROVER' | 'MEMBER';
  owner?: UserRef;
  reviewer?: RoleUserRef | null;
  approver?: RoleUserRef | null;
  sections?: SectionWithMeta[];
  documents?: DocumentItem[];
  statusEvents?: StatusEvent[];
};

export type ProjectListSection = {
  id: string;
  name: string;
  updatedAt: string;
};

export type DocumentItem = {
  id: string;
  type: string;
  url: string;
  version?: number;
  frameworkKey?: string;
  regulatoryContentVersion?: string | null;
  approvalState?: 'DRAFT' | 'APPROVED';
  lifecycleStatus?: 'CURRENT' | 'SUPERSEDED' | 'FAILED';
  provenanceStatus?: 'COMPLETE' | 'PARTIAL' | 'UNVERIFIED';
  createdAt: string;
};

export type ProjectListItem = {
  id: string;
  name: string;
  industry?: string | null;
  riskLevel?: string | null;
  description?: string | null;
  businessPurpose?: string | null;
  intendedUse?: string | null;
  intendedUsers?: string | null;
  affectedPersons?: string | null;
  deploymentGeography?: string | null;
  operatorRoles?: string[];
  lifecycleStage?: string | null;
  responsibleOwner?: string | null;
  providerOrDeveloper?: string | null;
  deployerOrUser?: string | null;
  importer?: string | null;
  distributor?: string | null;
  authorizedRepresentative?: string | null;
  generatesContent?: boolean | null;
  useCaseIndicators?: string[];
  sourcePublicResultId?: string | null;
  createdAt: string;
  updatedAt: string;
  workflowStatus?: ProjectWorkflowStatus;
  viewerRole: 'OWNER' | 'REVIEWER' | 'APPROVER' | 'MEMBER';
  sections: ProjectListSection[];
  documents: Array<
    Pick<
      DocumentItem,
      | 'id'
      | 'type'
      | 'createdAt'
      | 'version'
      | 'frameworkKey'
      | 'regulatoryContentVersion'
      | 'approvalState'
      | 'lifecycleStatus'
      | 'provenanceStatus'
    >
  >;
};

export type TrackableStepSummary = {
  stepId: string;
  title: string;
  missing: number;
  status: string;
};

export type FormValues = Record<string, unknown>;

export type ReviewerItem = {
  id: string;
  email: string;
  role: string;
};

export type TemplateItem = {
  id: string;
  name: string;
  category?: string;
  shared?: boolean;
  sectionName: string;
  ownerId: string;
  owner?: { email?: string };
  content?: FormValues;
};

export type TemplateUpdatePayload = {
  name?: string;
  category?: string;
  shared?: boolean;
};

export type ReminderItem = {
  id: string;
  message: string;
  dueAt: string;
  completed: boolean;
};

export type BulkTemplateAction = 'share' | 'unshare' | 'delete';

export type GenerationReadiness = {
  score: number;
  status: 'ready' | 'partial' | 'insufficient';
  generationMode: 'full' | 'draft' | 'gap_only';
  missingCriticalFields: string[];
  weakSections: string[];
  summary: string;
  obligationReadiness?: ObligationReadiness;
};

export type ObligationReadiness = {
  total: number;
  evidenced: number;
  complete: number;
  outstanding: Array<{
    id: string;
    title: string;
    status: string;
    evidenceCount: number;
  }>;
};

export type SuggestionResponse = {
  suggestion: string;
  structuredContent?: Record<string, string>;
};

export type AutosaveRecord = {
  id?: string;
  sectionId?: string;
  updatedAt: string;
  content: FormValues;
};

export type BillingPlan = {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE' | string;
  limits: {
    docs: number;
    reviews?: number;
    trust?: number;
    activeAiSystems?: number;
    users?: number;
    clientWorkspaces?: number;
    versionHistory?: boolean;
    reviewApproval?: boolean;
    exports?: boolean;
  };
};

export type BillingUsage = {
  companyId?: string;
  month?: string;
  docsGenerated: number;
  trustAnalyses?: number;
};
