import { type SectionWithMeta } from '../pages/ProjectPage';

export const sampleProject = {
  id: 'storybook-project',
  name: 'Storybook Compliance',
  industry: 'AI Safety',
  riskLevel: 'Medium',
  createdAt: new Date().toISOString(),
  status: 'IN_REVIEW',
};

export const sampleSections = new Map<string, SectionWithMeta>(
  [
    [
      'system_overview',
      {
        id: 'section-1',
        name: 'system_overview',
        content: { purpose: 'Assist reviewers', scope: 'Global' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        status: 'IN_REVIEW',
        artifacts: [],
      },
    ],
    [
      'risk_assessment',
      {
        id: 'section-2',
        name: 'risk_assessment',
        content: { risks: 'Bias in dataset' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        status: 'DRAFT',
        artifacts: [],
      },
    ],
  ],
);

export const stepFields = [
  { name: 'purpose', label: 'Purpose', type: 'input' },
  { name: 'scope', label: 'Scope', type: 'textarea' },
];

export const sampleTrackableSteps = [
  { stepId: 'system_overview', title: 'System overview', missing: 0, status: 'IN_REVIEW' },
  { stepId: 'risk_assessment', title: 'Risk assessment', missing: 2, status: 'DRAFT' },
];

export const sampleMetrics = [
  {
    id: 'metric-1',
    name: 'Fairness gap',
    pillar: 'Fairness',
    datasetName: 'Loan applications 2025',
    modelName: 'Credit scorer',
    unit: 'gap %',
    samples: [
      {
        id: 'sample-1',
        value: 0.04,
        status: 'OK',
        note: 'Monthly audit',
        timestamp: new Date().toISOString(),
      },
    ],
  },
];

export const notificationFeed = [
  {
    id: 'notif-1',
    title: 'Reviewer assigned',
    body: 'Alex will review your project this week.',
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  {
    id: 'notif-2',
    title: 'Document ready',
    body: 'Your technical file is ready to download.',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    readAt: null,
  },
];
