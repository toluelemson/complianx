export const PROJECT_WORKFLOW_STAGES = [
  {
    id: 'register',
    number: 1,
    label: 'Register',
    path: 'ai-system-profile',
    description: 'System name, owner, and intended use.',
  },
  {
    id: 'assess',
    number: 2,
    label: 'Assess',
    path: 'classification',
    description: 'Answer the essential EU AI Act questions.',
  },
  {
    id: 'comply',
    number: 3,
    label: 'Comply',
    path: 'requirements',
    description: 'Assign requirements and link evidence.',
  },
  {
    id: 'review',
    number: 4,
    label: 'Review',
    path: 'review-approval',
    description: 'Request human approval for the work.',
  },
  {
    id: 'report',
    number: 5,
    label: 'Report',
    path: 'compliance-package',
    description: 'Generate a verified compliance package.',
  },
] as const;

export type ProjectWorkflowStage = (typeof PROJECT_WORKFLOW_STAGES)[number];

export function projectWorkflowStagePath(
  projectId: string,
  stage: ProjectWorkflowStage,
) {
  return `/projects/${projectId}/${stage.path}`;
}
