export type DocumentOption = { type: string };

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
