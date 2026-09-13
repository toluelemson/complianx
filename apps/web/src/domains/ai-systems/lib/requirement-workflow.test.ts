import { describe, expect, it } from 'vitest';
import type { ObligationEvidenceLink } from '../api';
import { summarizeRequirementWorkflow } from './requirement-workflow';

const requirement = { status: 'IN_PROGRESS', approvalState: 'DRAFT' };

function artifact(
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
): ObligationEvidenceLink {
  return {
    id: `link-${status}`,
    linkType: 'PRIMARY',
    artifact: {
      id: `artifact-${status}`,
      originalName: 'policy.pdf',
      citationKey: 'E-1',
      status,
      version: 2,
    },
  };
}

describe('requirement workflow summary', () => {
  it('directs a missing-evidence requirement to add proof', () => {
    expect(summarizeRequirementWorkflow(requirement, [])).toEqual({
      evidenceLabel: 'Missing',
      reviewLabel: 'Cannot start',
      action: 'Add evidence',
    });
  });

  it('keeps rejected evidence ahead of approval actions', () => {
    expect(
      summarizeRequirementWorkflow(requirement, [artifact('REJECTED')]),
    ).toMatchObject({
      reviewLabel: 'Changes requested',
      action: 'Replace evidence',
    });
  });

  it('requires evidence review before a human requirement decision', () => {
    expect(
      summarizeRequirementWorkflow(requirement, [artifact('PENDING')]),
    ).toMatchObject({ reviewLabel: 'Needs review', action: 'Review evidence' });
    expect(
      summarizeRequirementWorkflow(requirement, [artifact('APPROVED')]),
    ).toMatchObject({ action: 'Record human decision' });
  });

  it('moves a human-approved requirement to package verification', () => {
    expect(
      summarizeRequirementWorkflow(
        { ...requirement, approvalState: 'APPROVED' },
        [artifact('APPROVED')],
      ),
    ).toMatchObject({ reviewLabel: 'Human approved', action: 'Check package' });
  });

  it('does not treat a reference-only link as compliance evidence', () => {
    expect(
      summarizeRequirementWorkflow(requirement, [
        { id: 'reference', linkType: 'REFERENCE' },
      ]),
    ).toMatchObject({ evidenceLabel: 'Missing', action: 'Add evidence' });
  });
});
