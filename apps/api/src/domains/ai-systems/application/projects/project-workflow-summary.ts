import { Prisma } from '@prisma/client';
import type {
  ProjectWorkflowAction,
  ProjectWorkflowStageId,
  ProjectWorkflowSummary,
} from '@complianx/contracts/ai-systems';
import {
  assessmentReassessmentReasons,
  hasVerifiedSupportingEvidence,
  materialAssessmentAuditFilter,
  workflowAuditFilter,
} from './workflow-freshness';

export const projectWorkflowInclude = Prisma.validator<Prisma.ProjectInclude>()(
  {
    assessments: {
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 1,
      select: {
        id: true,
        status: true,
        packVersion: { select: { status: true, supersededById: true } },
        classifications: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            category: true,
            reviewStatus: true,
            reviewerId: true,
            reviewedAt: true,
            createdAt: true,
            missingInformation: true,
          },
        },
      },
    },
    obligations: {
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        status: true,
        ownerId: true,
        approvalState: true,
        classificationResultId: true,
        obligation: { select: { title: true } },
        evidence: {
          where: { linkType: { in: ['PRIMARY', 'SUPPORTING'] } },
          select: {
            linkType: true,
            artifact: {
              select: {
                projectId: true,
                status: true,
                expiresAt: true,
                validFrom: true,
                reviewedById: true,
                reviewedAt: true,
              },
            },
            document: {
              select: {
                projectId: true,
                approvalState: true,
                lifecycleStatus: true,
              },
            },
          },
        },
        actions: {
          where: { status: { notIn: ['DONE', 'COMPLETED', 'CANCELLED'] } },
          take: 1,
          select: { id: true },
        },
      },
    },
    findings: {
      where: { status: { notIn: ['RESOLVED', 'ACCEPTED_RISK'] } },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    },
    auditEvents: {
      where: { OR: workflowAuditFilter },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { createdAt: true },
    },
    compliancePackages: {
      orderBy: { version: 'desc' },
      take: 1,
      select: { id: true, companyId: true, status: true, createdAt: true },
    },
    documents: {
      select: { createdAt: true, approvalState: true, lifecycleStatus: true },
    },
    statusEvents: {
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { createdAt: true },
    },
  },
);

type WorkflowProject = Prisma.ProjectGetPayload<{
  include: typeof projectWorkflowInclude;
}>;

export async function loadMaterialChanges(
  prisma: Pick<Prisma.TransactionClient, 'auditEvent'>,
  companyId: string,
  projectIds: string[],
) {
  if (!projectIds.length) return new Map<string, Date>();
  const rows = await prisma.auditEvent.groupBy({
    by: ['projectId'],
    where: {
      companyId,
      projectId: { in: projectIds },
      OR: materialAssessmentAuditFilter,
    },
    _max: { createdAt: true },
  });
  return new Map(
    rows.flatMap(({ projectId, _max }) =>
      projectId && _max.createdAt ? [[projectId, _max.createdAt] as const] : [],
    ),
  );
}

export function buildProjectWorkflowSummary(
  project: WorkflowProject,
  viewer: { id: string; membershipRole?: string | null },
  materialChange: Date | undefined,
  now: Date,
): ProjectWorkflowSummary {
  const assessment = project.assessments[0];
  const classification = assessment?.classifications[0];
  const reasons = assessmentReassessmentReasons(assessment, materialChange);
  const registered = Boolean(
    project.intendedUse?.trim() || project.description?.trim(),
  );
  const classified = Boolean(
    classification?.reviewedAt &&
      classification.reviewerId &&
      classification.reviewStatus !== 'PENDING' &&
      assessment?.status !== 'DRAFT' &&
      !reasons.length &&
      !(
        Array.isArray(classification.missingInformation) &&
        classification.missingInformation.length
      ),
  );
  const reviewed = project.workflowStatus === 'APPROVED';
  const canReview =
    viewer.id === project.reviewerId ||
    viewer.id === project.approverId ||
    viewer.membershipRole === 'ADMIN';
  const owner = viewer.id === project.ownerId;
  const contributor = owner || canReview;
  const requirements = project.obligations.filter(
    (item) =>
      item.status !== 'NOT_APPLICABLE' &&
      (!classification ||
        !item.classificationResultId ||
        item.classificationResultId === classification.id),
  );
  const items: ProjectWorkflowAction[] = [];
  function add(
    stage: ProjectWorkflowStageId,
    category: ProjectWorkflowAction['category'],
    title: string,
    detail: string,
    actionLabel: string,
    path: string,
    permission: ProjectWorkflowAction['permission'],
    entityType: ProjectWorkflowAction['entityType'] = 'project',
    entityId = project.id,
  ) {
    items.push({
      stage,
      category,
      title,
      detail,
      actionLabel,
      href: `/projects/${project.id}/${path}`,
      permission,
      entityType,
      entityId,
    });
  }

  if (!registered)
    add(
      'register',
      owner ? 'BLOCKED' : 'WAITING',
      'Complete the system profile',
      'Record what the AI system is intended to do.',
      'Open system profile',
      'ai-system-profile',
      'OWNER',
    );
  if (!classification || assessment?.status === 'DRAFT' || reasons.length)
    add(
      'assess',
      contributor ? 'BLOCKED' : 'WAITING',
      reasons.length
        ? 'Reassessment required'
        : 'Complete the applicability check',
      reasons[0] ??
        'Save the questionnaire and generate a preliminary classification.',
      'Open applicability check',
      reasons.length ? 'classification?reassess=1' : 'classification',
      'CONTRIBUTOR',
      'assessment',
      assessment?.id ?? project.id,
    );
  else if (!classified)
    add(
      'assess',
      canReview ? 'ACTION_REQUIRED' : 'WAITING',
      'Classification needs human review',
      'Check the result and resolve any missing information before relying on it.',
      'Open classification',
      'classification',
      'REVIEWER_OR_APPROVER',
      'assessment',
      assessment.id,
    );
  if (project.workflowStatus === 'CHANGES_REQUESTED')
    add(
      'review',
      'BLOCKED',
      'Project review changes were requested',
      'Address the reviewer’s feedback before resubmitting.',
      'Open review',
      'review-approval',
      'PROJECT_READER',
    );

  let verifiedRequirements = 0;
  let preparedRequirements = 0;
  for (const item of requirements) {
    const title = item.obligation.title;
    const section = `#requirement-${item.id}`;
    const verified = item.evidence.some((link) =>
      hasVerifiedSupportingEvidence(link, project.id, now),
    );
    const pending = item.evidence.some(
      ({ artifact }) =>
        artifact?.projectId === project.id &&
        artifact.status === 'PENDING' &&
        (!artifact.expiresAt || artifact.expiresAt > now) &&
        (!artifact.validFrom || artifact.validFrom <= now),
    );
    if (
      verified &&
      item.approvalState === 'APPROVED' &&
      item.status === 'COMPLETE'
    )
      verifiedRequirements++;
    if (item.ownerId && (verified || pending) && !item.actions.length)
      preparedRequirements++;
    if (!item.ownerId)
      add(
        'comply',
        'ACTION_REQUIRED',
        `Assign an owner: ${title}`,
        'An accountable owner is needed for this requirement.',
        'Assign owner',
        `requirements${section}`,
        'CONTRIBUTOR',
        'requirement',
        item.id,
      );
    if (!verified && !pending) {
      const expired = item.evidence.some(
        ({ artifact }) =>
          artifact?.projectId === project.id &&
          artifact.expiresAt &&
          artifact.expiresAt <= now,
      );
      const rejected = item.evidence.some(
        ({ artifact }) =>
          artifact?.projectId === project.id && artifact.status === 'REJECTED',
      );
      add(
        'comply',
        'BLOCKED',
        `${expired ? 'Evidence has expired' : rejected ? 'Evidence was rejected' : 'Evidence is missing'}: ${title}`,
        'Link current supporting evidence for this requirement.',
        expired || rejected ? 'Replace evidence' : 'Upload evidence',
        `evidence${section}`,
        'OWNER',
        'requirement',
        item.id,
      );
    } else if (item.approvalState === 'CHANGES_REQUESTED') {
      add(
        'comply',
        contributor ? 'ACTION_REQUIRED' : 'WAITING',
        `Changes requested: ${title}`,
        'Address the reviewer’s feedback and resubmit the requirement.',
        'Open requirement',
        `requirements${section}`,
        'CONTRIBUTOR',
        'requirement',
        item.id,
      );
    } else if (!verified) {
      add(
        'review',
        canReview ? 'ACTION_REQUIRED' : 'WAITING',
        `Evidence needs review: ${title}`,
        'Evidence has been linked and is awaiting a human decision.',
        'Open evidence',
        `evidence${section}`,
        'REVIEWER_OR_APPROVER',
        'requirement',
        item.id,
      );
    } else if (
      item.approvalState !== 'APPROVED' ||
      item.status !== 'COMPLETE'
    ) {
      add(
        'review',
        canReview ? 'ACTION_REQUIRED' : 'WAITING',
        `Requirement needs approval: ${title}`,
        'The linked evidence is verified. Record the requirement decision separately.',
        'Open requirement',
        `requirements${section}`,
        'REVIEWER_OR_APPROVER',
        'requirement',
        item.id,
      );
    }
    if (item.actions.length)
      add(
        'comply',
        'ACTION_REQUIRED',
        `Complete corrective actions: ${title}`,
        'This requirement has work outstanding.',
        'Open requirement',
        `requirements${section}`,
        'CONTRIBUTOR',
        'requirement',
        item.id,
      );
  }

  for (const finding of project.findings)
    add(
      'comply',
      'BLOCKED',
      'Resolve an open finding',
      'Record the resolution and any supporting evidence.',
      'Open findings',
      'findings',
      'CONTRIBUTOR',
      'finding',
      finding.id,
    );
  if (classified && assessment?.status !== 'FINALIZED')
    add(
      'assess',
      canReview ? 'ACTION_REQUIRED' : 'WAITING',
      'Finalize assessment traceability',
      'Review the recorded assessment and its supporting requirements.',
      'Open traceability',
      'traceability',
      'REVIEWER_OR_APPROVER',
      'assessment',
      assessment?.id ?? project.id,
    );
  if (!reviewed && project.workflowStatus !== 'CHANGES_REQUESTED') {
    const inReview = ['READY_FOR_REVIEW', 'IN_REVIEW', 'RESUBMITTED'].includes(
      project.workflowStatus,
    );
    add(
      'review',
      inReview && !canReview ? 'WAITING' : 'ACTION_REQUIRED',
      inReview
        ? 'Project review is in progress'
        : 'Prepare the project for review',
      inReview
        ? 'Check the review status and outstanding decisions.'
        : 'Check submission readiness and assign a reviewer.',
      'Open review',
      'review-approval',
      inReview ? 'REVIEWER_OR_APPROVER' : 'OWNER',
    );
  }

  const complied =
    classified &&
    preparedRequirements === requirements.length &&
    !project.findings.length;
  const latestPackage = project.compliancePackages[0];
  const currentDocuments = project.documents.filter(
    (document) => document.lifecycleStatus === 'CURRENT',
  );
  const packaged = Boolean(
    latestPackage &&
      latestPackage.companyId === project.companyId &&
      latestPackage.status === 'COMPLETE' &&
      reviewed &&
      complied &&
      assessment?.status === 'FINALIZED' &&
      verifiedRequirements === requirements.length &&
      currentDocuments.length &&
      currentDocuments.every(
        (document) =>
          document.approvalState === 'APPROVED' &&
          document.createdAt <= latestPackage.createdAt,
      ) &&
      (!project.auditEvents[0] ||
        project.auditEvents[0].createdAt <= latestPackage.createdAt) &&
      (!project.statusEvents[0] ||
        project.statusEvents[0].createdAt <= latestPackage.createdAt),
  );
  if (
    !packaged &&
    reviewed &&
    complied &&
    assessment?.status === 'FINALIZED' &&
    verifiedRequirements === requirements.length
  )
    add(
      'report',
      'ACTION_REQUIRED',
      latestPackage
        ? 'Refresh the compliance package'
        : 'Prepare the compliance package',
      'Check current document approvals and export readiness.',
      'Open compliance package',
      'compliance-package',
      'CONTRIBUTOR',
      'package',
      latestPackage?.id ?? project.id,
    );

  const completedStages: ProjectWorkflowStageId[] = [];
  if (registered) completedStages.push('register');
  if (classified) completedStages.push('assess');
  if (complied) completedStages.push('comply');
  if (reviewed && complied && verifiedRequirements === requirements.length)
    completedStages.push('review');
  if (packaged) completedStages.push('report');
  const terminal = ['ARCHIVED', 'CANCELLED'].includes(project.workflowStatus);
  const blockers = items.filter((item) => item.category === 'BLOCKED');
  return {
    projectId: project.id,
    name: project.name,
    workflowStatus: project.workflowStatus,
    completedStages,
    classificationCategory: classification?.category ?? null,
    applicableRequirements: requirements.length,
    verifiedRequirements,
    blockers: blockers.length,
    waiting: items.filter((item) => item.category === 'WAITING').length,
    outstanding: items.length,
    nextAction: terminal
      ? null
      : (blockers[0] ??
        items.find((item) => item.category === 'ACTION_REQUIRED') ??
        items[0] ??
        null),
    reassessmentReasons: reasons,
    packageStatus: packaged ? 'CURRENT' : latestPackage ? 'HISTORICAL' : 'NONE',
  };
}
