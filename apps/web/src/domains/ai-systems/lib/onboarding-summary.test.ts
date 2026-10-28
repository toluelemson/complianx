import { describe, expect, it } from 'vitest';
import { summarizeOnboarding } from './onboarding-summary';

describe('onboarding summary', () => {
  it('presents likely roles and requirements without marking drafts complete', () => {
    expect(
      summarizeOnboarding(
        {
          id: 'classification',
          assessmentId: 'assessment',
          category: 'action_required',
          reviewStatus: 'PENDING',
          resultSnapshot: {
            high_risk: true,
            operator_roles: ['provider', 'deployer'],
          },
        },
        [{ approvalState: 'DRAFT' }, { approvalState: 'APPROVED' }],
      ),
    ).toEqual({
      role: 'Provider, Deployer',
      category: 'High-risk',
      requirementCount: 2,
      needsAttention: 1,
    });
  });

  it('makes an absent role a human confirmation task', () => {
    const summary = summarizeOnboarding(
      {
        id: 'classification',
        assessmentId: 'assessment',
        category: 'action_required',
        reviewStatus: 'PENDING',
      },
      [],
    );
    expect(summary.role).toBe('Needs human confirmation');
    expect(summary.category).toBe('Action required');
  });
});
