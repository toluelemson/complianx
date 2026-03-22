import api from '@/api/client';
import type {
  PublicResultResponse,
  PublicSessionFinalizeResponse,
  EuAiActQuestionPack,
} from './types';

export async function loadPublicQuestionPack() {
  const { data } = await api.post<{ packVersion: string; questionPack: EuAiActQuestionPack }>(
    '/public/eu-ai-act/sessions',
    { locale: 'en' },
  );
  return {
    packVersion: data.packVersion,
    questionPack: data.questionPack,
  };
}

export async function runQuickAssessment(answers: Record<string, unknown>) {
  const { data } = await api.post<PublicSessionFinalizeResponse>(
    '/public/eu-ai-act/assess',
    { answers, locale: 'en' },
  );
  return data;
}

export async function getPublicResult(resultId: string) {
  const { data } = await api.get<PublicResultResponse>(
    `/public/eu-ai-act/results/${resultId}`,
  );
  return data;
}

export async function generateDemoReport(payload: {
  systemName: string;
  companyName: string;
  industry: string;
  useCase: string;
  inputData: string;
  outputDecision: string;
  stakeholders: string;
  operatorRole: string;
  geography: string;
  highRiskContext: string;
  oversightStatus: string;
  controlsStatus: string;
  documentationStatus: string;
  conformityStatus: string;
  notes?: string;
}) {
  const { data } = await api.post<{
    title: string;
    markdown: string;
    previewHtml: string;
    summary: string;
  }>('/public/eu-ai-act/demo-report', payload);
  return data;
}
