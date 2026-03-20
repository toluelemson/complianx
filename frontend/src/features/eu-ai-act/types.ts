export type EuAiActQuestionOption = {
  key: string;
  label: string;
  value: string;
  helperText?: string;
};

export type EuAiActVisibilityCondition = {
  fact: string;
  equals?: string | boolean | number | null;
  includes?: string;
};

export type EuAiActVisibilityRule = {
  all?: EuAiActVisibilityCondition[];
  any?: EuAiActVisibilityCondition[];
};

export type EuAiActQuestion = {
  key: string;
  type: 'single' | 'multi' | 'boolean' | 'text' | 'number';
  label: string;
  helperText?: string;
  explanation?: string;
  required?: boolean;
  legalReferenceIds?: string[];
  options?: EuAiActQuestionOption[];
  visibleWhen?: EuAiActVisibilityRule;
};

export type EuAiActStep = {
  key: string;
  title: string;
  questions: EuAiActQuestion[];
};

export type EuAiActQuestionPack = {
  key: string;
  version: string;
  title: string;
  description?: string;
  steps: EuAiActStep[];
};

export type PublicSessionResponse = {
  sessionId: string;
  sessionToken: string;
  expiresAt: string;
  packVersion: string;
  questionPack: EuAiActQuestionPack;
  steps: Array<{ key: string; title: string }>;
};

export type PublicSessionStateResponse = {
  id: string;
  status: 'DRAFT' | 'COMPLETED' | 'EXPIRED';
  packVersion: string;
  questionPack: EuAiActQuestionPack;
  answers: Record<string, unknown>;
  currentStep: string | null;
  expiresAt: string;
};

export type PublicSessionSummary = {
  in_scope: boolean;
  high_risk: boolean;
  prohibited: boolean;
  gpai: boolean;
  operator_roles: string[];
};

export type PublicSessionFinalizeResponse = {
  resultId: string;
  status: 'COMPLETED';
  summary: PublicSessionSummary;
  redirectUrl: string;
};

export type EuAiActResultPayload = {
  result_kind?: 'not_applicable' | 'out_of_scope' | 'prohibited' | 'action_required' | 'likely_compliant';
  in_scope: boolean;
  excluded?: boolean;
  prohibited?: boolean;
  high_risk?: boolean;
  transparency_obligations?: string[];
  gpai?: boolean;
  gpai_systemic_risk?: boolean;
  operator_roles?: string[];
  other_frameworks?: string[];
  considered_provider?: boolean;
  obligations?: Array<{ role?: string; title?: string }>;
  next_required_documents?: string[];
  missing_evidence?: string[];
  legal_references?: string[];
  reasoning_trace?: Array<{ step: number; code: string; summary: string }>;
  summary_sentence?: string;
  ambiguity_flags?: string[];
  legal_disclaimer?: boolean;
};

export type PublicResultResponse = {
  resultId: string;
  packVersion: string;
  result: EuAiActResultPayload;
  legalReferences: Array<{
    id: string;
    label: string;
    title: string;
    href: string;
  }>;
  shareEnabled: boolean;
  notLegalAdvice: boolean;
};
