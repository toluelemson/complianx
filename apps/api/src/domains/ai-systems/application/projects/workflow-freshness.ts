export const materialAssessmentAuditFilter = [
  { entityType: 'Project', action: 'AI_SYSTEM_PROFILE_UPDATED' },
  { entityType: 'SystemAsset' },
  { entityType: 'SystemLifecycleEvent' },
];

export const workflowAuditFilter = [
  ...materialAssessmentAuditFilter,
  {
    entityType: {
      in: [
        'Assessment',
        'ClassificationResult',
        'AiSystemObligation',
        'Finding',
        'ComplianceAction',
        'TechnicalMeasure',
        'DocumentationItem',
        'ComplianceStakeholder',
        'Document',
        'SectionArtifact',
        'ObligationEvidence',
      ],
    },
  },
];

export function assessmentReassessmentReasons(
  assessment:
    | {
        packVersion: { status: string; supersededById: string | null };
        classifications: Array<{ createdAt: Date }>;
      }
    | undefined,
  latestMaterialChange: Date | undefined,
) {
  const classification = assessment?.classifications[0];
  if (!assessment || !classification) return [];
  const reasons: string[] = [];
  if (latestMaterialChange && latestMaterialChange > classification.createdAt)
    reasons.push(
      'System profile, assets, or lifecycle changed after classification.',
    );
  if (
    assessment.packVersion.status === 'DEPRECATED' ||
    assessment.packVersion.supersededById
  )
    reasons.push(
      'The regulatory pack used for this classification has been superseded or deprecated.',
    );
  return reasons;
}

export function hasVerifiedSupportingEvidence(
  link: {
    linkType: string;
    artifact: {
      projectId: string;
      status: string;
      reviewedById: string | null;
      reviewedAt: Date | null;
      expiresAt: Date | null;
      validFrom: Date | null;
    } | null;
    document: {
      projectId: string;
      approvalState: string;
      lifecycleStatus: string;
    } | null;
  },
  projectId: string,
  now: Date,
) {
  if (link.linkType !== 'PRIMARY' && link.linkType !== 'SUPPORTING')
    return false;
  const { artifact, document } = link;
  return (
    (artifact?.projectId === projectId &&
      artifact.status === 'APPROVED' &&
      Boolean(artifact.reviewedById && artifact.reviewedAt) &&
      (!artifact.expiresAt || artifact.expiresAt > now) &&
      (!artifact.validFrom || artifact.validFrom <= now)) ||
    (document?.projectId === projectId &&
      document.approvalState === 'APPROVED' &&
      document.lifecycleStatus === 'CURRENT')
  );
}
