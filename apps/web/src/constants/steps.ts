export interface StepField {
  name: string;
  label: string;
  type?: 'textarea' | 'text';
  placeholder?: string;
}

export interface StepConfig {
  id: string;
  title: string;
  description: string;
  fields: StepField[];
}

export const STEP_CONFIG: StepConfig[] = [
  {
    id: 'system_overview',
    title: 'System Overview',
    description: 'Summarize purpose, context and intended users.',
    fields: [
      { name: 'purpose', label: 'Purpose', type: 'textarea' },
      { name: 'intendedUsers', label: 'Intended Users', type: 'textarea' },
      {
        name: 'deploymentContext',
        label: 'Deployment Context',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'model_info',
    title: 'Model Information',
    description: 'Capture architecture, training details, and performance.',
    fields: [
      { name: 'modelType', label: 'Model Type', type: 'text' },
      { name: 'trainingData', label: 'Training Data', type: 'textarea' },
      { name: 'metrics', label: 'Key Metrics', type: 'textarea' },
    ],
  },
  {
    id: 'data_governance',
    title: 'Data & Governance',
    description: 'Describe input data flows, governance, and privacy.',
    fields: [
      { name: 'dataSources', label: 'Data Sources', type: 'textarea' },
      { name: 'qualityChecks', label: 'Quality Checks', type: 'textarea' },
      { name: 'privacy', label: 'Privacy Controls', type: 'textarea' },
    ],
  },
  {
    id: 'risk_assessment',
    title: 'Risk Assessment',
    description: 'Identify risks, likelihood, and impacts.',
    fields: [
      { name: 'risks', label: 'Key Risks', type: 'textarea' },
      { name: 'likelihood', label: 'Likelihood', type: 'text' },
      { name: 'impact', label: 'Potential Impact', type: 'textarea' },
    ],
  },
  {
    id: 'human_oversight',
    title: 'Human Oversight',
    description: 'Document oversight roles and escalation paths.',
    fields: [
      { name: 'roles', label: 'Oversight Roles', type: 'textarea' },
      { name: 'escalations', label: 'Escalation Process', type: 'textarea' },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring & Maintenance',
    description: 'Explain monitoring, alerts, and retraining cadence.',
    fields: [
      { name: 'monitoringPlan', label: 'Monitoring Plan', type: 'textarea' },
      {
        name: 'maintenance',
        label: 'Maintenance Cadence',
        type: 'textarea',
      },
    ],
  },
  {
    id: 'review_generate',
    title: 'Review & Generate',
    description: 'Verify information and trigger documentation generation.',
    fields: [],
  },
];

export const TRACKABLE_STEP_COUNT = STEP_CONFIG.filter(
  (step) => step.fields.length > 0,
).length;
