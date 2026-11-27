import { describe, expect, it } from 'vitest';
import {
  PROJECT_WORKFLOW_STAGES,
  projectWorkflowStagePath,
} from './workflow-stages';

describe('project workflow stages', () => {
  it('defines the canonical five stages in user journey order', () => {
    expect(PROJECT_WORKFLOW_STAGES.map((stage) => stage.label)).toEqual([
      'Register',
      'Assess',
      'Comply',
      'Review',
      'Report',
    ]);
  });

  it('builds a project-scoped path for a stage', () => {
    expect(
      projectWorkflowStagePath('project-1', PROJECT_WORKFLOW_STAGES[2]),
    ).toBe('/projects/project-1/requirements');
  });
});
