import api from '@/platform/api/client';
import type { NewProjectFormValues } from './components/NewProjectModal';
import type {
  ArtifactStatus,
  AutosaveRecord,
  BillingPlan,
  BillingUsage,
  BulkTemplateAction,
  DocumentItem,
  FormValues,
  GenerationReadiness,
  ProjectDetail,
  ProjectListItem,
  ReminderItem,
  ReviewerItem,
  SectionArtifactItem,
  SectionWithMeta,
  SuggestionResponse,
  TemplateItem,
  TemplateUpdatePayload,
} from '@complianx/contracts/ai-systems';

export async function listProjects() {
  const { data } = await api.get<ProjectListItem[]>('/projects');
  return data;
}

export async function createProject(values: NewProjectFormValues) {
  const { data } = await api.post<ProjectDetail>('/projects', values);
  return data;
}

export async function cloneProject(projectId: string, name: string) {
  const { data } = await api.post<ProjectDetail>(`/projects/${projectId}/clone`, {
    name,
  });
  return data;
}

export async function getProject(projectId: string) {
  const { data } = await api.get<ProjectDetail>(`/projects/${projectId}`);
  return data;
}

export async function getProjectSections(projectId: string) {
  const { data } = await api.get<SectionWithMeta[]>(
    `/projects/${projectId}/sections`,
  );
  return data;
}

export async function saveProjectSection(projectId: string, payload: {
  name: string;
  content: FormValues;
}) {
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

export async function getGenerationReadiness(projectId: string) {
  const { data } = await api.get<GenerationReadiness>(
    `/projects/${projectId}/generate/readiness`,
  );
  return data;
}

export async function generateProjectDocuments(
  projectId: string,
  payload: { documentTypes: string[] },
) {
  const { data } = await api.post<DocumentItem[]>(
    `/projects/${projectId}/generate`,
    payload,
  );
  return data;
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

export async function uploadArtifact(projectId: string, payload: {
  sectionId: string;
  file: File;
  description?: string;
  purpose?: 'GENERIC' | 'DATASET' | 'MODEL';
}) {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.description) {
    formData.append('description', payload.description);
  }
  if (payload.purpose) {
    formData.append('purpose', payload.purpose);
  }
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
  const { data } = await api.post<AutosaveRecord>('/autosave/sections', payload);
  return data;
}

export async function getSectionAutosave(sectionId: string) {
  const { data } = await api.get<AutosaveRecord | null>(
    `/autosave/sections/${sectionId}`,
  );
  return data;
}

export async function addSectionComment(projectId: string, payload: {
  sectionId: string;
  body: string;
}) {
  const { data } = await api.post(
    `/projects/${projectId}/sections/${payload.sectionId}/comments`,
    { body: payload.body },
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
