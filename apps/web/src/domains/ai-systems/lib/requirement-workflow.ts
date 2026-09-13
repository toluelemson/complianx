import type { ObligationEvidenceLink } from '../api';

type Requirement = {
  approvalState: string;
  status: string;
};

export function summarizeRequirementWorkflow(
  requirement: Requirement,
  evidence: ObligationEvidenceLink[],
) {
  const relevant = evidence.filter((link) => link.linkType !== 'REFERENCE');
  const rejected = relevant.find(
    (link) => link.artifact?.status === 'REJECTED',
  );
  const pending = relevant.find((link) => link.artifact?.status === 'PENDING');
  const approvedCount = relevant.filter(
    (link) =>
      link.artifact?.status === 'APPROVED' ||
      link.document?.approvalState === 'APPROVED',
  ).length;

  if (requirement.status === 'NOT_APPLICABLE') {
    return {
      evidenceLabel: 'Not required',
      reviewLabel: 'Not required',
      action: 'View basis',
    };
  }
  if (!relevant.length) {
    return {
      evidenceLabel: 'Missing',
      reviewLabel: 'Cannot start',
      action: 'Add evidence',
    };
  }
  if (rejected) {
    return {
      evidenceLabel: `${relevant.length} linked`,
      reviewLabel: 'Changes requested',
      action: 'Replace evidence',
    };
  }
  if (pending) {
    return {
      evidenceLabel: `${relevant.length} linked`,
      reviewLabel: 'Needs review',
      action: 'Review evidence',
    };
  }
  if (requirement.approvalState !== 'APPROVED') {
    return {
      evidenceLabel: `${approvedCount} approved`,
      reviewLabel: 'Evidence reviewed',
      action: 'Record human decision',
    };
  }
  return {
    evidenceLabel: `${approvedCount} approved`,
    reviewLabel: 'Human approved',
    action: 'Check package',
  };
}
