export const DOCUMENT_LABELS: Record<string, string> = {
  technical_doc: 'Technical Documentation',
  model_card: 'Model Card',
  risk_assessment: 'Risk Assessment',
  nist_rmf_profile: 'NIST AI RMF Profile',
};

export type DocumentGenerationOption = {
  type: string;
  label: string;
  framework?: string;
  description: string;
};

export const DOCUMENT_GENERATION_OPTIONS: DocumentGenerationOption[] = [
  {
    type: 'technical_doc',
    label: 'EU AI Act Technical File',
    framework: 'EU AI Act',
    description:
      'Detailed system, data, risk, and oversight coverage aligned to EU AI Act Article 11 technical documentation expectations.',
  },
  {
    type: 'model_card',
    label: 'Model Card',
    framework: 'Model Reporting',
    description:
      'Summaries of model purpose, intended use, performance, and limitations for stakeholders who rely on standard model cards.',
  },
  {
    type: 'risk_assessment',
    label: 'Risk Assessment',
    framework: 'Internal Controls',
    description:
      'Tabular risk register capturing severity, likelihood, and mitigations for governance or audit review.',
  },
  {
    type: 'nist_rmf_profile',
    label: 'NIST AI RMF Profile',
    framework: 'NIST AI RMF',
    description:
      'Maps project context to the Govern, Map, Measure, and Manage functions to evidence alignment with NIST guidance.',
  },
];

export const DEFAULT_DOCUMENT_SELECTION = DOCUMENT_GENERATION_OPTIONS.map(
  (option) => option.type,
);
