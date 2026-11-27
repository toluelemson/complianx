import api from '@/platform/api/client';
import type { NewProjectFormValues } from './components/NewProjectModal';
import type {
  ArtifactStatus,
  AuditEvent,
  AutosaveRecord,
  BillingPlan,
  BillingUsage,
  BulkTemplateAction,
  DocumentItem,
  FormValues,
  GenerationReadiness,
  ProjectDetail,
  ProjectListItem,
  ProjectWorkflowSummary,
  ReminderItem,
  ReviewerItem,
  SectionArtifactItem,
  SectionWithMeta,
  SuggestionResponse,
  TemplateItem,
  TemplateUpdatePayload,
} from '@complianx/contracts/ai-systems';

export async function listProjectAuditEvents(projectId: string) {
  const { data } = await api.get<AuditEvent[]>(
    `/projects/${projectId}/audit-events`,
  );
  return data;
}

export async function listProjects() {
  const { data } = await api.get<ProjectListItem[]>('/projects');
  return data;
}

export async function getProjectWorkflowSummary(projectId: string) {
  const { data } = await api.get<ProjectWorkflowSummary>(
    `/projects/${projectId}/workflow-summary`,
  );
  return data;
}

export async function getOrganizationProfile() {
  const { data } = await api.get<{
    company: {
      legalName?: string | null;
      website?: string | null;
      industry?: string | null;
      address?: string | null;
      contactEmail?: string | null;
    };
  }>('/company');
  return data.company;
}

export async function updateOrganizationProfile(
  profile: Record<string, string>,
) {
  const { data } = await api.patch('/company/profile', profile);
  return data;
}

export async function listAiSystems() {
  const { data } = await api.get<ProjectListItem[]>('/ai-systems');
  return data;
}

export async function createProject(values: NewProjectFormValues) {
  const { data } = await api.post<ProjectDetail>('/projects', values);
  return data;
}

export async function createAiSystem(values: NewProjectFormValues) {
  const { data } = await api.post<ProjectDetail>('/ai-systems', values);
  return data;
}

export async function classifyProjectIntake(projectId: string) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/assessments/preliminary`,
  );
  return data;
}

export async function createProjectAssessment(projectId: string) {
  const { data } = await api.post<{ id: string }>(
    `/ai-systems/${projectId}/assessments`,
    {},
  );
  return data;
}

export type AssessmentWorkspace = {
  id: string;
  status: 'DRAFT' | 'CLASSIFIED' | 'FINALIZED' | 'ARCHIVED';
  weightingChoice: string;
  targetBand: string;
  versionNumber: number;
  assessmentDate: string;
  assessorType: string;
  assessorName?: string | null;
  coverageScore?: number | null;
  updatedAt: string;
  packVersion: { id: string; key: string; version: string };
  requirementRows: Array<{
    id: string;
    obligationId: string;
    requirementId: string;
    score: number | null;
    state: string;
    weight: number;
    rationale: string | null;
    evidenceLinks: unknown;
    obligation: {
      id: string;
      status: string;
      obligation: {
        catalogueId: string;
        title: string;
        aiActArticle: string | null;
        legalReference?: string | null;
        trustworthinessPrinciple: string;
        architectureElements: unknown;
        verificationMethod: string;
      };
    };
  }>;
  changeLog: Array<{
    id: string;
    versionNumber: number;
    action: string;
    snapshot: unknown;
    createdAt: string;
  }>;
};

export async function getAssessmentWorkspace(projectId: string) {
  const { data } = await api.get<AssessmentWorkspace | null>(
    `/ai-systems/${projectId}/assessments/workspace`,
  );
  return data;
}

export async function updateAssessmentScoring(
  projectId: string,
  assessmentId: string,
  payload: {
    weightingChoice?: string;
    targetBand?: string;
    rows?: Array<{
      obligationId: string;
      score?: number | null;
      state?: string;
      weight?: number;
      rationale?: string | null;
      evidenceLinks?: string[];
    }>;
  },
) {
  const { data } = await api.put(
    `/ai-systems/${projectId}/assessments/${assessmentId}/scoring`,
    payload,
  );
  return data;
}

export async function classifyAssessment(
  projectId: string,
  assessmentId: string,
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/assessments/${assessmentId}/classify`,
  );
  return data;
}

export type PreliminaryClassification = {
  id: string;
  assessmentId: string;
  category: string;
  reviewStatus: string;
  assessment?: { status: 'DRAFT' | 'CLASSIFIED' | 'FINALIZED' | 'ARCHIVED' };
  regulatoryContentVersion?: string;
  ruleSetVersion?: string;
  resultSnapshot?: {
    in_scope?: boolean;
    high_risk?: boolean;
    prohibited?: boolean;
    operator_roles?: string[];
    summary_sentence?: string;
    missing_information?: string[];
    human_review_required?: boolean;
  };
};

export async function getPreliminaryClassification(projectId: string) {
  const { data } = await api.get(
    `/ai-systems/${projectId}/assessments/preliminary`,
  );
  return data as PreliminaryClassification | null;
}

export async function listAssessmentAnswers(
  projectId: string,
  assessmentId: string,
) {
  const { data } = await api.get<
    Array<{
      id: string;
      questionKey: string;
      valueJson: unknown;
      createdAt: string;
      updatedAt: string;
      answeredBy: { id: string; email: string };
    }>
  >(`/ai-systems/${projectId}/assessments/${assessmentId}/answers`);
  return data;
}

export async function saveAssessmentAnswers(
  projectId: string,
  assessmentId: string,
  answers: Record<string, unknown>,
) {
  const { data } = await api.put(
    `/ai-systems/${projectId}/assessments/${assessmentId}/answers`,
    { answers },
  );
  return data;
}

export async function reviewClassification(
  projectId: string,
  classificationId: string,
  payload: {
    status: 'REVIEWED' | 'OVERRIDDEN';
    overrideCategory?: string;
    reason?: string;
  },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/assessments/classifications/${classificationId}/review`,
    payload,
  );
  return data;
}

export async function listProjectObligations(projectId: string) {
  const { data } = await api.get<
    Array<{
      id: string;
      status: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      approvalState:
        | 'DRAFT'
        | 'READY_FOR_REVIEW'
        | 'APPROVED'
        | 'CHANGES_REQUESTED';
      applicabilityReason?: string | null;
      owner?: { id: string; email: string } | null;
      dueAt?: string | null;
      obligation: {
        key?: string;
        catalogueId?: string;
        title: string;
        legalReference?: string | null;
        aiActArticle?: string | null;
        trustworthinessPrinciple?: string | null;
        architectureElements?: unknown;
        verificationMethod?: string | null;
      };
      actions: Array<{
        id: string;
        title: string;
        status: string;
        closureEvidenceId?: string | null;
        closureNotes?: string | null;
      }>;
    }>
  >(`/ai-systems/${projectId}/obligations`);
  return data.map((item) => ({
    ...item,
    status:
      item.status === 'READY'
        ? 'READY_FOR_REVIEW'
        : item.status === 'COMPLETE'
          ? 'SATISFIED'
          : item.status,
  }));
}

export async function listProjectFindings(projectId: string) {
  const { data } = await api.get<
    Array<{
      id: string;
      source: string;
      severity: string;
      status: string;
      description: string;
      obligationId?: string | null;
      resolutionSummary?: string | null;
      reviewerDecision?: string | null;
      owner?: { id: string; email: string } | null;
      obligation?: { obligation?: { key?: string; title: string } } | null;
      actions: Array<{
        id: string;
        title: string;
        status: string;
        closureEvidenceId?: string | null;
        closureNotes?: string | null;
      }>;
    }>
  >(`/ai-systems/${projectId}/findings`);
  return data;
}

export async function getObligationTraceability(
  projectId: string,
  obligationId: string,
) {
  const { data } = await api.get<ObligationTraceability>(
    `/ai-systems/${projectId}/obligations/${obligationId}/traceability`,
  );
  return data;
}

export type ObligationTraceability = {
  requirement: {
    id: string;
    identifier: string;
    title: string;
    description?: string | null;
    legalReference?: string | null;
    applicability: string;
    ownerId?: string | null;
  };
  applicability: { status: string; reason?: string | null };
  implementation: { approvalState: string };
  evidence: Array<{
    id: string;
    linkType: 'PRIMARY' | 'SUPPORTING' | 'REFERENCE';
    artifact?: {
      id: string;
      originalName: string;
      evidenceVersion: number;
      uploadedAt: string;
      reviewerStatus: ArtifactStatus;
      reviewer?: { id: string; email: string } | null;
      reviewedAt?: string | null;
    } | null;
    document?: {
      id: string;
      type: string;
      version?: number;
      approvalState?: string;
    } | null;
  }>;
  missingEvidence: Array<{ id: string; title: string; status: string }>;
  review: {
    approvalState: string;
    approval?: {
      actor?: { id: string; email: string } | null;
      decidedAt: string;
    } | null;
  };
  packageInclusion: Array<{
    id: string;
    version: number;
    createdAt: string;
    included: boolean;
  }>;
};

export type TraceabilityModel = {
  project: {
    id: string;
    name: string;
    description?: string | null;
    lifecycleStage?: string | null;
    providerOrDeveloper?: string | null;
    company?: {
      name: string;
      registrationNumber?: string | null;
      country?: string | null;
      aiActRole?: string | null;
    } | null;
  };
  assessment?: {
    id: string;
    status: 'DRAFT' | 'CLASSIFIED' | 'FINALIZED' | 'ARCHIVED';
    date: string;
    assessorType: string;
    assessorName: string;
    coverageScore?: number | null;
    versionNumber: number;
    catalogueVersion: string;
  } | null;
  assets: Array<{
    id: string;
    name: string;
    description?: string | null;
    assetType: string;
    lifecycleStage?: string | null;
    version?: string | null;
  }>;
  obligations: Array<{
    id: string;
    obligation: {
      catalogueId: string;
      title: string;
      aiActArticle: string;
      trustworthinessPrinciple: string;
      architectureElements: unknown;
      verificationMethod: string;
    };
    assetLinks: Array<{ systemAsset: { id: string; name: string } }>;
    technicalMeasures: Array<{
      id: string;
      title: string;
      description?: string | null;
      status: 'PLANNED' | 'PARTIAL' | 'COMPLETE';
      verificationNotes?: string | null;
    }>;
    documentationItems: Array<{ id: string; title: string }>;
    evidence: Array<{ id: string }>;
  }>;
  documentationItems: Array<{
    id: string;
    title: string;
    documentType: string;
    description?: string | null;
    referenceUrl?: string | null;
    systemAsset?: { id: string; name: string } | null;
    obligation?: {
      id: string;
      obligation: { catalogueId: string; title: string };
    } | null;
  }>;
  lifecycleEvents: Array<{
    id: string;
    stage: string;
    happenedAt: string;
    notes?: string | null;
    createdBy: { id: string; email: string };
    createdAt: string;
  }>;
  stakeholders: Array<{
    id: string;
    role: string;
    name: string;
    registrationNumber?: string | null;
    country?: string | null;
    contactEmail?: string | null;
    notes?: string | null;
    createdBy: { id: string; email: string };
    createdAt: string;
    updatedAt: string;
  }>;
  history: Array<{
    id: string;
    source: 'AUDIT' | 'ASSESSMENT';
    action: string;
    entityType: string;
    entityId: string;
    versionNumber?: number | null;
    actor: string;
    snapshot?: unknown;
    createdAt: string;
  }>;
  gaps: Array<{
    id: string;
    severity: 'BLOCKER' | 'WARNING' | 'INFO';
    category: 'ASSESSMENT' | 'ASSET' | 'STAKEHOLDER' | 'LIFECYCLE' | 'EVIDENCE';
    title: string;
    recommendation: string;
    obligationId?: string;
    assetId?: string;
  }>;
  finalization: { ready: boolean; blockers: string[] };
  reassessment: { required: boolean; reason: string | null };
  scope: { included: string; excluded: string };
};

export async function getTraceabilityModel(projectId: string) {
  const { data } = await api.get<TraceabilityModel>(
    `/ai-systems/${projectId}/traceability-model`,
  );
  return {
    ...data,
    assessment: data.assessment
      ? {
          ...data.assessment,
          status: data.assessment.status ?? 'CLASSIFIED',
        }
      : data.assessment,
    assets: data.assets ?? [],
    obligations: data.obligations ?? [],
    documentationItems: data.documentationItems ?? [],
    lifecycleEvents: data.lifecycleEvents ?? [],
    stakeholders: data.stakeholders ?? [],
    history: data.history ?? [],
    gaps: data.gaps ?? [],
    finalization: data.finalization ?? {
      ready: false,
      blockers: ['Reload after the API update completes'],
    },
    reassessment: data.reassessment ?? { required: false, reason: null },
  } satisfies TraceabilityModel;
}

export async function createSystemAsset(
  projectId: string,
  payload: {
    name: string;
    description?: string;
    assetType: string;
    lifecycleStage?: string;
    version?: string;
  },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/system-assets`,
    payload,
  );
  return data;
}

export async function updateSystemAsset(
  projectId: string,
  assetId: string,
  payload: { lifecycleStage: string },
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/system-assets/${assetId}`,
    payload,
  );
  return data;
}

export async function createLifecycleEvent(
  projectId: string,
  payload: { stage: string; happenedAt: string; notes?: string },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/lifecycle-events`,
    payload,
  );
  return data;
}

export async function createComplianceStakeholder(
  projectId: string,
  payload: {
    role: string;
    name: string;
    registrationNumber?: string;
    country?: string;
    contactEmail?: string;
    notes?: string;
  },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/stakeholders`,
    payload,
  );
  return data;
}

export async function updateComplianceStakeholder(
  projectId: string,
  stakeholderId: string,
  payload: Partial<{
    role: string;
    name: string;
    registrationNumber: string;
    country: string;
    contactEmail: string;
    notes: string;
  }>,
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/stakeholders/${stakeholderId}`,
    payload,
  );
  return data;
}

export async function updateRequirementAssetLinks(
  projectId: string,
  obligationId: string,
  assetIds: string[],
) {
  const { data } = await api.put(
    `/ai-systems/${projectId}/obligations/${obligationId}/assets`,
    { assetIds },
  );
  return data;
}

export async function createTechnicalMeasure(
  projectId: string,
  obligationId: string,
  payload: {
    title: string;
    description?: string;
    status: 'PLANNED' | 'PARTIAL' | 'COMPLETE';
    verificationNotes?: string;
  },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/obligations/${obligationId}/technical-measures`,
    payload,
  );
  return data;
}

export async function updateTechnicalMeasure(
  projectId: string,
  measureId: string,
  payload: {
    title?: string;
    description?: string;
    status?: 'PLANNED' | 'PARTIAL' | 'COMPLETE';
    verificationNotes?: string;
  },
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/technical-measures/${measureId}`,
    payload,
  );
  return data;
}

export async function createDocumentationItem(
  projectId: string,
  payload: {
    documentType: string;
    title: string;
    description?: string;
    referenceUrl?: string;
    systemAssetId?: string;
    aiSystemObligationId?: string;
  },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/documentation-items`,
    payload,
  );
  return data;
}

export async function updateAssessmentContext(
  projectId: string,
  assessmentId: string,
  payload: {
    assessorType: string;
    assessorName?: string;
    assessmentDate: string;
  },
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/assessments/${assessmentId}/context`,
    payload,
  );
  return data;
}

export async function finalizeAssessment(
  projectId: string,
  assessmentId: string,
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/assessments/${assessmentId}/finalize`,
  );
  return data;
}

export async function createProjectFinding(
  projectId: string,
  payload: {
    obligationId?: string;
    source: 'ASSESSMENT' | 'EVIDENCE_REVIEW' | 'MONITORING' | 'MANUAL_REVIEW';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    ownerId?: string;
  },
) {
  const { data } = await api.post(`/ai-systems/${projectId}/findings`, payload);
  return data;
}

export async function updateProjectFinding(
  projectId: string,
  findingId: string,
  payload: {
    status?: string;
    resolutionSummary?: string;
    reviewerDecision?: string;
  },
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/findings/${findingId}`,
    payload,
  );
  return data;
}

export async function updateProjectObligation(
  projectId: string,
  obligationId: string,
  payload: {
    status?: string;
    priority?: string;
    approvalState?: string;
    ownerId?: string;
    dueAt?: string;
  },
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/obligations/${obligationId}`,
    payload,
  );
  return data;
}

export type ObligationEvidenceLink = {
  id: string;
  linkType: 'PRIMARY' | 'SUPPORTING' | 'REFERENCE';
  notes?: string | null;
  artifact?: {
    id: string;
    originalName: string;
    citationKey: string;
    status: ArtifactStatus;
    version: number;
    expiresAt?: string | null;
  } | null;
  document?: {
    id: string;
    type: string;
    approvalState?: 'DRAFT' | 'APPROVED';
    lifecycleStatus?: 'CURRENT' | 'SUPERSEDED' | 'FAILED';
    createdAt: string;
  } | null;
};

export async function listObligationEvidence(
  projectId: string,
  obligationId: string,
) {
  const { data } = await api.get<ObligationEvidenceLink[]>(
    `/ai-systems/${projectId}/obligations/${obligationId}/evidence`,
  );
  return data;
}

export async function linkObligationEvidence(
  projectId: string,
  obligationId: string,
  payload: {
    artifactId?: string;
    documentId?: string;
    linkType?: 'PRIMARY' | 'SUPPORTING' | 'REFERENCE';
  },
) {
  const { data } = await api.post<ObligationEvidenceLink>(
    `/ai-systems/${projectId}/obligations/${obligationId}/evidence`,
    payload,
  );
  return data;
}

export async function unlinkObligationEvidence(
  projectId: string,
  obligationId: string,
  linkId: string,
) {
  const { data } = await api.delete<{ success: boolean }>(
    `/ai-systems/${projectId}/obligations/${obligationId}/evidence/${linkId}`,
  );
  return data;
}

export async function listAssignedReviews() {
  const { data } = await api.get<
    Array<{
      id: string;
      name: string;
      ownerId: string;
      ownerEmail?: string;
      reviewerId: string | null;
      approverId: string | null;
      workflowStatus: string;
      workflowVersion: number;
      updatedAt: string;
    }>
  >('/reviews/assigned-to-me');
  return data;
}

export async function getAiSystem(aiSystemId: string) {
  const { data } = await api.get<ProjectDetail>(`/ai-systems/${aiSystemId}`);
  return data;
}

export async function cloneProject(projectId: string, name: string) {
  const { data } = await api.post<ProjectDetail>(
    `/projects/${projectId}/clone`,
    {
      name,
    },
  );
  return data;
}

export async function getProject(projectId: string) {
  const { data } = await api.get<ProjectDetail>(`/projects/${projectId}`);
  return data;
}

export async function updateProject(
  projectId: string,
  payload: Record<string, unknown> & { name: string },
) {
  const { data } = await api.patch<ProjectDetail>(
    `/projects/${projectId}`,
    payload,
  );
  return data;
}

export async function getProjectSections(projectId: string) {
  const { data } = await api.get<SectionWithMeta[]>(
    `/projects/${projectId}/sections`,
  );
  return data;
}

export async function saveProjectSection(
  projectId: string,
  payload: {
    name: string;
    content: FormValues;
  },
) {
  const { data } = await api.post<SectionWithMeta>(
    `/projects/${projectId}/sections`,
    payload,
  );
  return data;
}

export async function getProjectDocuments(projectId: string) {
  const { data } = await api.get<DocumentItem[]>(
    `/projects/${projectId}/documents`,
  );
  return data;
}

export async function approveDocument(documentId: string) {
  const { data } = await api.patch<DocumentItem>(
    `/documents/${documentId}/approve`,
  );
  return data;
}

export async function getGenerationReadiness(projectId: string) {
  const { data } = await api.get<GenerationReadiness>(
    `/projects/${projectId}/generate/readiness`,
  );
  return data;
}

export async function generateProjectDocuments(
  projectId: string,
  payload: { documentTypes: string[]; operationId?: string },
) {
  const { data } = await api.post<{ runId: string; operationId: string }>(
    `/projects/${projectId}/generate`,
    payload,
  );
  return data;
}

export type CompliancePackageRecord = {
  id: string;
  projectId: string;
  version: number;
  status: string;
  manifest: Record<string, unknown> & {
    completeness?: { status: string; gaps: string[] };
  };
  manifestHash: string;
  archiveHash?: string | null;
  createdAt: string;
};

export async function createCompliancePackage(projectId: string) {
  const { data } = await api.post<CompliancePackageRecord>(
    `/ai-systems/${projectId}/reports/package`,
  );
  return data;
}

export async function listCompliancePackages(projectId: string) {
  const { data } = await api.get<CompliancePackageRecord[]>(
    `/ai-systems/${projectId}/reports/packages`,
  );
  return data;
}

export async function verifyCompliancePackage(
  projectId: string,
  packageId: string,
) {
  const { data } = await api.get(
    `/ai-systems/${projectId}/reports/packages/${packageId}/verify`,
  );
  return data as {
    valid: boolean;
    manifestValid: boolean;
    archiveValid: boolean;
    checkedAt: string;
    errors: string[];
  };
}

export async function listTemplates(sectionName: string) {
  const { data } = await api.get<TemplateItem[]>('/templates', {
    params: { sectionName },
  });
  return data;
}

export async function createTemplate(payload: {
  name: string;
  sectionName: string;
  content: FormValues;
  category?: string;
  shared?: boolean;
}) {
  const { data } = await api.post<TemplateItem>('/templates', payload);
  return data;
}

export async function updateTemplate(
  templateId: string,
  updates: TemplateUpdatePayload,
) {
  const { data } = await api.patch<TemplateItem>(
    `/templates/${templateId}`,
    updates,
  );
  return data;
}

export async function deleteTemplate(templateId: string) {
  const { data } = await api.delete<TemplateItem>(`/templates/${templateId}`);
  return data;
}

export async function bulkTemplateAction(payload: {
  templateIds: string[];
  action: BulkTemplateAction;
}) {
  const { data } = await api.post<TemplateItem[]>('/templates/bulk', payload);
  return data;
}

export async function listProjectReminders(projectId: string) {
  const { data } = await api.get<ReminderItem[]>(
    `/projects/${projectId}/reminders`,
  );
  return data;
}

export async function createProjectReminder(
  projectId: string,
  payload: { message: string; dueAt: string },
) {
  const { data } = await api.post<ReminderItem>(
    `/projects/${projectId}/reminders`,
    payload,
  );
  return data;
}

export async function updateProjectReminder(
  projectId: string,
  reminderId: string,
  payload: { completed?: boolean; message?: string; dueAt?: string },
) {
  const { data } = await api.patch<ReminderItem>(
    `/projects/${projectId}/reminders/${reminderId}`,
    payload,
  );
  return data;
}

export async function listProjectReviewers(projectId: string) {
  const { data } = await api.get<ReviewerItem[]>(
    `/projects/${projectId}/reviewers`,
  );
  return data;
}

export async function uploadArtifact(
  projectId: string,
  payload: {
    sectionId: string;
    file: File;
    description?: string;
    purpose?: 'GENERIC' | 'DATASET' | 'MODEL';
    source?: string;
    expiresAt?: string;
    externalUrl?: string;
    provenanceNote?: string;
  },
) {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.description) {
    formData.append('description', payload.description);
  }
  if (payload.purpose) {
    formData.append('purpose', payload.purpose);
  }
  if (payload.source) formData.append('source', payload.source);
  if (payload.expiresAt) formData.append('expiresAt', payload.expiresAt);
  if (payload.externalUrl) formData.append('externalUrl', payload.externalUrl);
  if (payload.provenanceNote)
    formData.append('provenanceNote', payload.provenanceNote);
  const { data } = await api.post<SectionArtifactItem>(
    `/projects/${projectId}/sections/${payload.sectionId}/artifacts`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function deleteArtifact(artifactId: string) {
  const { data } = await api.delete(`/artifacts/${artifactId}`);
  return data;
}

export async function reviewArtifact(payload: {
  artifactId: string;
  status: ArtifactStatus;
  comment?: string;
}) {
  const { data } = await api.patch<SectionArtifactItem>(
    `/artifacts/${payload.artifactId}/review`,
    {
      status: payload.status,
      comment: payload.comment,
    },
  );
  return data;
}

export async function getBillingPlan() {
  const { data } = await api.get<BillingPlan>('/billing/plan');
  return data;
}

export async function getBillingUsage() {
  const { data } = await api.get<BillingUsage>('/billing/usage');
  return data;
}

export async function sendSuggestionFeedback(payload: {
  projectId: string;
  sectionId: string;
  fieldName: string;
  suggestion: string;
  liked: boolean;
}) {
  const { data } = await api.post('/suggestions/feedback', payload);
  return data;
}

export async function suggestSection(
  projectId: string,
  sectionName: string,
  payload: {
    hint?: string;
    partialContent?: FormValues;
    targetField?: string;
  },
) {
  const { data } = await api.post<SuggestionResponse>(
    `/projects/${projectId}/sections/${sectionName}/suggest`,
    payload,
  );
  return data;
}

export async function saveSectionAutosave(payload: {
  sectionId: string;
  content: FormValues;
}) {
  const { data } = await api.post<AutosaveRecord>(
    '/autosave/sections',
    payload,
  );
  return data;
}

export async function getSectionAutosave(sectionId: string) {
  const { data } = await api.get<AutosaveRecord | null>(
    `/autosave/sections/${sectionId}`,
  );
  return data;
}

export async function addSectionComment(
  projectId: string,
  payload: {
    sectionId: string;
    body: string;
    mentions?: string[];
    linkedEntityType?: string;
    linkedEntityId?: string;
  },
) {
  const { data } = await api.post(
    `/projects/${projectId}/sections/${payload.sectionId}/comments`,
    {
      body: payload.body,
      mentions: payload.mentions,
      linkedEntityType: payload.linkedEntityType,
      linkedEntityId: payload.linkedEntityId,
    },
  );
  return data;
}

export async function setCommentResolution(
  projectId: string,
  sectionId: string,
  commentId: string,
  resolved: boolean,
) {
  const { data } = await api.patch(
    `/projects/${projectId}/sections/${sectionId}/comments/${commentId}/resolution`,
    { resolved },
  );
  return data;
}

export async function runProjectWorkflowAction(payload: {
  endpoint: string;
  body?: Record<string, unknown>;
}) {
  const { data } = await api.post(payload.endpoint, payload.body ?? {});
  return data;
}

export async function createRemediationAction(
  projectId: string,
  obligationId: string,
  payload: { title: string; findingId: string },
) {
  const { data } = await api.post(
    `/ai-systems/${projectId}/obligations/${obligationId}/actions`,
    payload,
  );
  return data;
}
export async function updateRemediationAction(
  projectId: string,
  actionId: string,
  payload: {
    status: string;
    closureEvidenceId?: string;
    closureNotes?: string;
  },
) {
  const { data } = await api.patch(
    `/ai-systems/${projectId}/actions/${actionId}`,
    payload,
  );
  return data;
}

export async function downloadDocument(documentId: string) {
  const { data } = await api.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  return data as Blob;
}

export async function downloadProjectDocuments(projectId: string) {
  const { data } = await api.get(`/projects/${projectId}/documents.zip`, {
    responseType: 'blob',
  });
  return data as Blob;
}

export async function downloadArtifact(artifactId: string) {
  const { data } = await api.get(`/artifacts/${artifactId}/download`, {
    responseType: 'blob',
  });
  return data as Blob;
}

export async function downloadCompliancePackage(
  projectId: string,
  packageId: string,
) {
  const { data } = await api.get(
    `/ai-systems/${projectId}/reports/packages/${packageId}/download`,
    { responseType: 'blob' },
  );
  return data as Blob;
}
