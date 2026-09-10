import { describe, expect, it } from 'vitest';
import {
  canApproveProject,
  canRequestProjectChanges,
  canStartProjectReview,
  getProjectAttentionReasons,
  isValidApprovalSignature,
  selectDocumentTypesForCredits,
} from './project-page-logic';

describe('project page policy helpers', () => {
  it('limits document selection to available credits', () => {
    const options = [
      { type: 'technical_doc' },
      { type: 'model_card' },
      { type: 'risk_assessment' },
    ];

    expect(selectDocumentTypesForCredits(options, 2)).toEqual([
      'technical_doc',
      'model_card',
    ]);
    expect(selectDocumentTypesForCredits(options, 0)).toEqual([]);
    expect(selectDocumentTypesForCredits(options, Infinity)).toEqual([
      'technical_doc',
      'model_card',
      'risk_assessment',
    ]);
  });

  it('accepts only non-empty approval signatures', () => {
    expect(isValidApprovalSignature(' Signed by owner ')).toBe(true);
    expect(isValidApprovalSignature('   ')).toBe(false);
  });

  it('enforces workflow permissions by assignment and admin role', () => {
    expect(canStartProjectReview('REVIEWER')).toBe(true);
    expect(canStartProjectReview('OWNER')).toBe(false);
    expect(canStartProjectReview('OWNER', 'ADMIN')).toBe(true);

    expect(canApproveProject('APPROVER')).toBe(true);
    expect(canApproveProject('REVIEWER')).toBe(false);
    expect(canApproveProject('OWNER', 'ADMIN')).toBe(true);

    expect(canRequestProjectChanges('REVIEWER')).toBe(true);
    expect(canRequestProjectChanges('APPROVER')).toBe(false);
    expect(canRequestProjectChanges('OWNER', 'ADMIN')).toBe(true);
  });

  it('explains why a system needs attention', () => {
    expect(
      getProjectAttentionReasons({
        workflowStatus: 'DRAFT',
        sections: [],
        documents: [],
      }),
    ).toEqual([
      'Complete the system intake',
      'Generate the EU AI Act Documentation Package',
    ]);
    expect(
      getProjectAttentionReasons({
        workflowStatus: 'CHANGES_REQUESTED',
        sections: Array.from({ length: 8 }),
        documents: [{ lifecycleStatus: 'FAILED' }],
      }),
    ).toEqual([
      'Address requested review changes',
      'Retry failed package generation',
    ]);
  });
});
