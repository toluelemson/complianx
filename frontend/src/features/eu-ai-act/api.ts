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
