import type { ObligationEvidenceLink, PreliminaryClassification } from '../api';

export type AttentionCategory = 'BLOCKED' | 'ACTION_REQUIRED' | 'WAITING';

export type AttentionItem = {
  category: AttentionCategory;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  entityType: 'assessment' | 'requirement' | 'evidence' | 'review' | 'document';
  entityId: string;
};

type Requirement = {
  id: string;
  status: string;
  approvalState: string;
  obligation: { title: string };
};

type ProjectAttentionInput = {
  projectId: string;
  workflowStatus?: string;
  viewerRole?: string;
  classification?: PreliminaryClassification | null;
  requirements: Requirement[];
  evidenceByRequirement: Record<string, ObligationEvidenceLink[]>;
  documents: Array<{ id: string; type: string; lifecycleStatus?: string }>;
  incompleteSectionCount: number;
  now?: number;
};

const categoryOrder: Record<AttentionCategory, number> = {
  BLOCKED: 0,
  ACTION_REQUIRED: 1,
  WAITING: 2,
};

export function buildProjectAttention(input: ProjectAttentionInput) {
  const items: AttentionItem[] = [];
  const unreadyRequirementIds = new Set<string>();
  const requirementsHref = `/projects/${input.projectId}/requirements`;
  const evidenceHref = `/projects/${input.projectId}/evidence`;
  const now = input.now ?? Date.now();

  if (!input.classification) {
    items.push({
      category: 'BLOCKED',
      title: 'EU AI Act assessment is incomplete',
      detail: 'Answer the guided questions before requirements can be mapped.',
      actionLabel: 'Continue assessment',
      href: `/projects/${input.projectId}/classification`,
      entityType: 'assessment',
      entityId: input.projectId,
    });
  } else if (input.classification.reviewStatus === 'PENDING') {
    items.push({
      category: 'WAITING',
      title: 'Classification needs human review',
      detail: 'The preliminary result is saved but is not a final decision.',
      actionLabel: 'Open classification',
      href: `/projects/${input.projectId}/classification`,
      entityType: 'review',
      entityId: input.classification.id,
    });
  }

  if (input.workflowStatus === 'CHANGES_REQUESTED') {
    items.push({
      category: 'BLOCKED',
      title: 'Project review changes were requested',
      detail: 'Address the reviewer’s feedback before resubmitting.',
      actionLabel: 'Open review',
      href: `/projects/${input.projectId}/review-approval`,
      entityType: 'review',
      entityId: input.projectId,
    });
  } else if (
    ['READY_FOR_REVIEW', 'IN_REVIEW', 'RESUBMITTED'].includes(
      input.workflowStatus ?? '',
    )
  ) {
    items.push({
      category: 'WAITING',
      title: 'Project is awaiting human review',
      detail:
        'The assigned reviewer or approver must record the next decision.',
      actionLabel: 'View review status',
      href: `/projects/${input.projectId}/review-approval`,
      entityType: 'review',
      entityId: input.projectId,
    });
  }

  for (const requirement of input.requirements) {
    if (requirement.status === 'NOT_APPLICABLE') continue;
    const links = (input.evidenceByRequirement[requirement.id] ?? []).filter(
      (link) => link.linkType === 'PRIMARY' || link.linkType === 'SUPPORTING',
    );
    const rejected = links.find((link) => link.artifact?.status === 'REJECTED');
    const expired = links.find(
      (link) =>
        link.artifact?.expiresAt &&
        new Date(link.artifact.expiresAt).getTime() <= now,
    );
    const pending = links.find((link) => link.artifact?.status === 'PENDING');

    if (
      requirement.approvalState !== 'APPROVED' ||
      rejected ||
      expired ||
      pending ||
      !links.length
    ) {
      unreadyRequirementIds.add(requirement.id);
    }

    if (requirement.approvalState === 'CHANGES_REQUESTED') {
      items.push(
        requirementItem(
          requirement,
          'BLOCKED',
          'Review changes requested',
          'Address feedback and resubmit this requirement.',
          'Open requirement',
          requirementsHref,
        ),
      );
    } else if (rejected) {
      items.push(
        requirementItem(
          requirement,
          'BLOCKED',
          'Evidence was rejected',
          'Replace or correct the rejected evidence.',
          'Upload evidence',
          evidenceHref,
          'evidence',
          rejected.artifact?.id,
        ),
      );
    } else if (expired) {
      items.push(
        requirementItem(
          requirement,
          'BLOCKED',
          'Evidence has expired',
          'Upload a current version before this requirement can be approved.',
          'Replace evidence',
          evidenceHref,
          'evidence',
          expired.artifact?.id,
        ),
      );
    } else if (!links.length) {
      items.push(
        requirementItem(
          requirement,
          'BLOCKED',
          'Evidence is missing',
          'Link evidence that demonstrates how this requirement is met.',
          'Upload evidence',
          evidenceHref,
        ),
      );
    } else if (pending) {
      const canReview =
        input.viewerRole === 'REVIEWER' || input.viewerRole === 'APPROVER';
      items.push(
        requirementItem(
          requirement,
          canReview ? 'ACTION_REQUIRED' : 'WAITING',
          canReview
            ? 'Evidence needs your review'
            : 'Evidence is awaiting review',
          canReview
            ? 'Review the linked evidence and record a decision.'
            : 'An assigned reviewer must record a decision.',
          canReview ? 'Review evidence' : 'View evidence',
          evidenceHref,
          'evidence',
          pending.artifact?.id,
        ),
      );
    } else if (requirement.approvalState !== 'APPROVED') {
      items.push(
        requirementItem(
          requirement,
          ['READY_FOR_REVIEW', 'UNDER_REVIEW'].includes(requirement.status)
            ? 'WAITING'
            : 'ACTION_REQUIRED',
          ['READY_FOR_REVIEW', 'UNDER_REVIEW'].includes(requirement.status)
            ? 'Requirement is awaiting approval'
            : 'Requirement still needs work',
          'Approved evidence is linked, but an authorized human decision is still required.',
          'Open requirement',
          requirementsHref,
        ),
      );
    }
  }

  for (const document of input.documents) {
    if (!['FAILED', 'SUPERSEDED'].includes(document.lifecycleStatus ?? ''))
      continue;
    items.push({
      category: 'ACTION_REQUIRED',
      title:
        document.lifecycleStatus === 'FAILED'
          ? 'Document generation failed'
          : 'Technical documentation is outdated',
      detail:
        document.lifecycleStatus === 'FAILED'
          ? 'Retry generation after checking the source information.'
          : 'Generate a current version before final review.',
      actionLabel: 'Open documents',
      href: `/projects/${input.projectId}/documents`,
      entityType: 'document',
      entityId: document.id,
    });
  }

  if (input.incompleteSectionCount > 0 && input.requirements.length > 0) {
    items.push({
      category: 'ACTION_REQUIRED',
      title: `${input.incompleteSectionCount} documentation ${input.incompleteSectionCount === 1 ? 'area needs' : 'areas need'} information`,
      detail:
        'Complete the system information used in evidence and generated documents.',
      actionLabel: 'Continue documentation',
      href: `/projects/${input.projectId}`,
      entityType: 'document',
      entityId: input.projectId,
    });
  }

  items.sort(
    (left, right) =>
      categoryOrder[left.category] - categoryOrder[right.category],
  );
  const eligibleRequirements = input.requirements.filter(
    (item) => item.status !== 'NOT_APPLICABLE',
  );
  const completeRequirements = eligibleRequirements.filter(
    (item) =>
      item.approvalState === 'APPROVED' && !unreadyRequirementIds.has(item.id),
  ).length;
  return {
    items,
    blockers: items.filter((item) => item.category === 'BLOCKED').length,
    waiting: items.filter((item) => item.category === 'WAITING').length,
    score: eligibleRequirements.length
      ? Math.round((completeRequirements / eligibleRequirements.length) * 100)
      : 0,
    primary: items[0] ?? null,
  };
}

function requirementItem(
  requirement: Requirement,
  category: AttentionCategory,
  prefix: string,
  detail: string,
  actionLabel: string,
  href: string,
  entityType: AttentionItem['entityType'] = 'requirement',
  entityId = requirement.id,
): AttentionItem {
  return {
    category,
    title: `${prefix}: ${requirement.obligation.title}`,
    detail,
    actionLabel,
    href: `${href}#${entityType}-${entityId}`,
    entityType,
    entityId,
  };
}
