import { describe, expect, it } from 'vitest';
import type { ObligationEvidenceLink } from '../api';
import { buildProjectAttention } from './project-attention';

const classification = {
  id: 'classification-1',
  assessmentId: 'assessment-1',
  category: 'HIGH_RISK',
  reviewStatus: 'CONFIRMED',
};

const requirement = {
  id: 'requirement-1',
  status: 'IN_PROGRESS',
  approvalState: 'DRAFT',
  obligation: { title: 'Maintain technical documentation' },
};

function build(
  overrides: Partial<Parameters<typeof buildProjectAttention>[0]> = {},
) {
  return buildProjectAttention({
    projectId: 'project-1',
    workflowStatus: 'DRAFT',
    viewerRole: 'OWNER',
    classification,
    requirements: [],
    evidenceByRequirement: {},
    documents: [],
    incompleteSectionCount: 0,
    ...overrides,
  });
}

function evidence(
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  expiresAt?: string,
): ObligationEvidenceLink {
  return {
    id: `link-${status}`,
    linkType: 'PRIMARY',
    artifact: {
      id: `artifact-${status}`,
      originalName: 'evidence.pdf',
      citationKey: 'E-1',
      status,
      version: 1,
      expiresAt,
    },
  };
}

describe('project attention', () => {
  it('makes an incomplete assessment the primary blocker', () => {
    const result = build({ classification: null });
    expect(result.primary).toMatchObject({
      category: 'BLOCKED',
      entityType: 'assessment',
      href: '/projects/project-1/classification',
    });
  });

  it('distinguishes rejected, expired, and missing evidence', () => {
    const requirements = [
      requirement,
      { ...requirement, id: 'requirement-2' },
      { ...requirement, id: 'requirement-3' },
    ];
    const result = build({
      requirements,
      evidenceByRequirement: {
        'requirement-1': [evidence('REJECTED')],
        'requirement-2': [evidence('APPROVED', '2025-01-01T00:00:00Z')],
        'requirement-3': [
          { id: 'reference', linkType: 'REFERENCE', document: null },
        ],
      },
      now: Date.parse('2026-09-13T00:00:00Z'),
    });
    expect(result.items.map((item) => item.title)).toEqual([
      'Evidence was rejected: Maintain technical documentation',
      'Evidence has expired: Maintain technical documentation',
      'Evidence is missing: Maintain technical documentation',
    ]);
    expect(result.blockers).toBe(3);
  });

  it('routes pending evidence to a reviewer and waits for an owner', () => {
    const input = {
      requirements: [requirement],
      evidenceByRequirement: { 'requirement-1': [evidence('PENDING')] },
    };
    expect(build({ ...input, viewerRole: 'OWNER' }).primary?.category).toBe(
      'WAITING',
    );
    expect(build({ ...input, viewerRole: 'REVIEWER' }).primary).toMatchObject({
      category: 'ACTION_REQUIRED',
      href: '/projects/project-1/evidence#evidence-artifact-PENDING',
    });
  });

  it('calculates readiness from human-approved applicable requirements', () => {
    const result = build({
      requirements: [
        { ...requirement, approvalState: 'APPROVED' },
        { ...requirement, id: 'requirement-2' },
        {
          ...requirement,
          id: 'requirement-3',
          status: 'NOT_APPLICABLE',
        },
      ],
      evidenceByRequirement: {
        'requirement-1': [evidence('APPROVED')],
        'requirement-2': [],
      },
    });
    expect(result.score).toBe(50);
    expect(result.primary?.entityId).toBe('requirement-2');
  });

  it('removes expired evidence from readiness even after approval', () => {
    const result = build({
      requirements: [{ ...requirement, approvalState: 'APPROVED' }],
      evidenceByRequirement: {
        'requirement-1': [evidence('APPROVED', '2025-01-01T00:00:00Z')],
      },
      now: Date.parse('2026-09-13T00:00:00Z'),
    });
    expect(result.score).toBe(0);
    expect(result.primary?.title).toContain('Evidence has expired');
  });
});
