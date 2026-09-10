export type DocumentOption = { type: string };

type AttentionProject = {
  workflowStatus?: string;
  sections?: Array<unknown>;
  documents?: Array<{
    lifecycleStatus?: string;
  }>;
};

export function getProjectAttentionReasons(project: AttentionProject) {
  const reasons: string[] = [];
  const sections = project.sections?.length ?? 0;
  const status = project.workflowStatus ?? 'DRAFT';
  const documents = project.documents ?? [];
  const failedDocuments = documents.filter(
    (document) => document.lifecycleStatus === 'FAILED',
  );

  if (status === 'CHANGES_REQUESTED') {
    reasons.push('Address requested review changes');
  } else if (status === 'DRAFT') {
    if (sections === 0) reasons.push('Complete the system intake');
    else if (sections < 8) {
      const remaining = 8 - sections;
      reasons.push(
        `Complete ${remaining} more control area${remaining === 1 ? '' : 's'}`,
      );
    } else reasons.push('Submit the system for review');
  }
  if (failedDocuments.length) reasons.push('Retry failed package generation');
  if (!documents.length)
    reasons.push('Generate the EU AI Act Documentation Package');
  return reasons;
}

export function selectDocumentTypesForCredits(
  options: DocumentOption[],
  remainingCredits: number,
) {
  if (!Number.isFinite(remainingCredits)) {
    return options.map((option) => option.type);
  }

  return options
    .slice(0, Math.max(0, Math.floor(remainingCredits)))
    .map((option) => option.type);
}

export function isValidApprovalSignature(signature: string) {
  return signature.trim().length > 0;
}

export function canStartProjectReview(viewerRole: string, userRole?: string) {
  return viewerRole === 'REVIEWER' || userRole === 'ADMIN';
}

export function canApproveProject(viewerRole: string, userRole?: string) {
  return viewerRole === 'APPROVER' || userRole === 'ADMIN';
}

export function canRequestProjectChanges(
  viewerRole: string,
  userRole?: string,
) {
  return viewerRole === 'REVIEWER' || userRole === 'ADMIN';
}
