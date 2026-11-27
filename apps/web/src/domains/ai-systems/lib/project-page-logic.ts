export type DocumentOption = { type: string };

export function hasFieldValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
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
