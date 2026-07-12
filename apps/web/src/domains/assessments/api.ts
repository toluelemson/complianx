import api from '@/platform/api/client';
import type {
  SectionSummary,
  TrustCohortAnalysisResponse,
  TrustMetric,
  TrustProjectDetail,
} from '@complianx/contracts/assessments';

export async function getTrustProject(projectId: string) {
  const { data } = await api.get<TrustProjectDetail>(`/projects/${projectId}`);
  return data;
}

export async function getTrustSections(projectId: string) {
  const { data } = await api.get<SectionSummary[]>(
    `/projects/${projectId}/sections`,
  );
  return data;
}

export async function listTrustMetrics(projectId: string) {
  const { data } = await api.get<TrustMetric[]>(`/projects/${projectId}/metrics`);
  return data;
}

export async function createTrustMetric(projectId: string, payload: {
  name: string;
  pillar: string;
  unit: string;
  targetMin?: number;
  targetMax?: number;
  datasetName?: string;
  modelName?: string;
  sectionId?: string;
}) {
  const { data } = await api.post<TrustMetric>(
    `/projects/${projectId}/metrics`,
    payload,
  );
  return data;
}

export async function deleteTrustMetric(projectId: string, metricId: string) {
  const { data } = await api.delete(`/projects/${projectId}/metrics/${metricId}`);
  return data;
}

export async function createTrustSample(metricId: string, payload: {
  value: number;
  note?: string;
  artifactId?: string;
}) {
  const { data } = await api.post(`/metrics/${metricId}/samples`, payload, {
    timeout: 10000,
  });
  return data;
}

export async function deleteTrustSample(sampleId: string) {
  const { data } = await api.delete(`/samples/${sampleId}`);
  return data;
}

export async function uploadTrustArtifact(payload: {
  projectId: string;
  sectionId: string;
  file: File;
  description: string;
  purpose: 'GENERIC' | 'DATASET' | 'MODEL';
}) {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('description', payload.description);
  formData.append('purpose', payload.purpose);
  const { data } = await api.post(
    `/projects/${payload.projectId}/sections/${payload.sectionId}/artifacts`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data as { id: string };
}

export async function analyzeFairness(payload: {
  projectId: string;
  datasetArtifactId: string;
  modelArtifactId?: string;
}) {
  const { data } = await api.post('/trust/fairness/analyze', payload);
  return data;
}

export async function analyzeRobustness(payload: {
  projectId: string;
  datasetArtifactId: string;
  columns: {
    y_pred_baseline?: string;
    y_pred_perturbed?: string;
    y_score?: string;
  };
}) {
  const { data } = await api.post('/trust/robustness/analyze', payload);
  return data;
}

export async function analyzeDrift(payload: {
  projectId: string;
  baselineArtifactId: string;
  currentArtifactId: string;
  columns?: string[];
  targets?: { y_true?: string; y_score?: string };
}) {
  const { data } = await api.post('/trust/drift/analyze', payload);
  return data;
}

export async function analyzeCohorts(payload: {
  projectId: string;
  datasetArtifactId: string;
  columns?: {
    sensitive_attribute?: string;
    y_true?: string;
    y_pred?: string;
  };
  segments: Array<{
    name: string;
    filter: { column: string; values: (string | number)[] };
  }>;
}) {
  const { data } = await api.post<TrustCohortAnalysisResponse>(
    '/trust/fairness/segments',
    payload,
  );
  return data;
}
