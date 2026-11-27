import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComplianceStakeholderRole } from '@prisma/client';
import { AssessmentsService } from './assessments.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { AuditService } from '../../../audit/application/audit.service';

describe('Conceptual traceability model', () => {
  it('returns assets, canonical requirements, measures, and coverage', async () => {
    const projectRecord = {
      id: 'project',
      companyId: 'company',
      ownerId: 'owner',
      reviewerId: null,
      approverId: null,
    };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue(projectRecord),
        findFirst: jest.fn().mockResolvedValue({
          id: 'project',
          name: 'Hiring AI',
          company: { name: 'Example Ltd' },
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'owner',
          companyId: 'company',
          role: 'USER',
        }),
      },
      assessment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assessment',
          status: 'CLASSIFIED',
          updatedAt: new Date('2026-10-31T00:00:00Z'),
          assessmentDate: new Date('2026-10-31T00:00:00Z'),
          assessorType: 'SELF_ASSESSMENT',
          assessorName: null,
          coverageScore: null,
          versionNumber: 1,
          createdBy: { id: 'owner', email: 'owner@example.com' },
          packVersion: { version: '2026.10' },
          requirementRows: [
            {
              obligationId: 'system-obligation',
              score: 80,
              weight: 2,
              state: 'IN_PROGRESS',
              rationale: 'Human override was tested.',
              evidenceLinks: ['https://example.com/override-test'],
            },
            {
              obligationId: 'other-obligation',
              score: 60,
              weight: 1,
              state: 'IN_PROGRESS',
              rationale: 'Partially implemented.',
              evidenceLinks: [],
            },
          ],
          changeLog: [],
        }),
      },
      systemAsset: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'asset', name: 'Ranking model', assetType: 'MODEL' },
          ]),
      },
      aiSystemObligation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'system-obligation',
            obligation: {
              catalogueId: 'EU-AIA-ART-14-HUMAN-OVERSIGHT',
              catalogue: {
                id: 'EU-AIA-ART-14-HUMAN-OVERSIGHT',
                text: 'Human oversight',
                aiActArticle: 'Art. 14',
                trustworthinessPrinciple: 'HUMAN_OVERSIGHT',
                architectureElements: ['Reviewer console'],
                verificationMethod: 'Test the override path',
              },
            },
            assetLinks: [],
            technicalMeasures: [
              { id: 'measure', title: 'Override control', status: 'PARTIAL' },
            ],
            documentationItems: [],
            evidence: [],
          },
        ]),
      },
      documentationItem: { findMany: jest.fn().mockResolvedValue([]) },
      systemLifecycleEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'lifecycle',
            stage: 'PILOT',
            happenedAt: new Date('2026-10-01T00:00:00Z'),
          },
        ]),
      },
      complianceStakeholder: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'stakeholder', role: 'PROVIDER' }]),
      },
      auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    const result = await service.getTraceabilityModel(
      'project',
      'owner',
      'company',
    );

    expect(result.assessment?.coverageScore).toBe(73.33);
    expect(result.assets[0]).toMatchObject({ name: 'Ranking model' });
    expect(result.obligations[0].obligation).toMatchObject({
      catalogueId: 'EU-AIA-ART-14-HUMAN-OVERSIGHT',
      title: 'Human oversight',
    });
    expect(result.scope.excluded).toContain('human review');
    expect(result.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'requirement-asset-system-obligation',
          severity: 'BLOCKER',
        }),
      ]),
    );
    expect(result.finalization.ready).toBe(false);
    expect(result.reassessment).toEqual({ required: false, reason: null });
  });

  it('requires human reassessment when a lifecycle event follows finalization', async () => {
    const projectRecord = {
      id: 'project',
      companyId: 'company',
      ownerId: 'owner',
      reviewerId: null,
      approverId: null,
    };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue(projectRecord),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'project', name: 'Hiring AI' }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'owner',
          companyId: 'company',
          role: 'USER',
        }),
      },
      assessment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assessment',
          status: 'FINALIZED',
          assessmentDate: new Date('2026-10-01T00:00:00Z'),
          updatedAt: new Date('2026-10-15T00:00:00Z'),
          assessorType: 'SELF_ASSESSMENT',
          assessorName: null,
          coverageScore: 100,
          versionNumber: 1,
          createdBy: { id: 'owner', email: 'owner@example.com' },
          packVersion: { version: '2026.10' },
          requirementRows: [],
          changeLog: [],
        }),
      },
      systemAsset: { findMany: jest.fn().mockResolvedValue([]) },
      aiSystemObligation: { findMany: jest.fn().mockResolvedValue([]) },
      documentationItem: { findMany: jest.fn().mockResolvedValue([]) },
      systemLifecycleEvent: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'event', happenedAt: new Date('2026-10-16T00:00:00Z') },
          ]),
      },
      complianceStakeholder: { findMany: jest.fn().mockResolvedValue([]) },
      auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    const result = await service.getTraceabilityModel(
      'project',
      'owner',
      'company',
    );

    expect(result.reassessment).toEqual({
      required: true,
      reason:
        '1 lifecycle event(s) were recorded after this assessment was finalized.',
    });
  });

  it('does not create assets outside the active company', async () => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'other-company',
          ownerId: 'owner',
          reviewerId: null,
          approverId: null,
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'owner',
          companyId: 'company',
          role: 'ADMIN',
        }),
      },
      systemAsset: { create: jest.fn() },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    await expect(
      service.createSystemAsset('project', 'owner', 'company', {
        name: 'Model',
        assetType: 'MODEL',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.systemAsset.create).not.toHaveBeenCalled();
  });

  it('updates an asset lifecycle stage inside the active project and audits it', async () => {
    const existing = {
      id: 'asset',
      projectId: 'project',
      name: 'Decision model',
      lifecycleStage: null,
    };
    const updated = { ...existing, lifecycleStage: 'PRODUCTION' };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'company',
          ownerId: 'owner',
          reviewerId: null,
          approverId: null,
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'owner',
          companyId: 'company',
          role: 'ADMIN',
        }),
      },
      systemAsset: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    await expect(
      service.updateSystemAsset('project', 'asset', 'owner', 'company', {
        lifecycleStage: 'PRODUCTION',
      }),
    ).resolves.toEqual(updated);
    expect(prisma.systemAsset.findFirst).toHaveBeenCalledWith({
      where: { id: 'asset', projectId: 'project' },
    });
    expect(prisma.systemAsset.update).toHaveBeenCalledWith({
      where: { id: 'asset' },
      data: { lifecycleStage: 'PRODUCTION' },
    });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LIFECYCLE_STAGE_UPDATED',
          companyId: 'company',
          projectId: 'project',
        }),
      }),
    );
  });

  it('does not update assets outside the active company', async () => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'other-company',
          ownerId: 'owner',
          reviewerId: null,
          approverId: null,
        }),
      },
      userCompany: { findUnique: jest.fn() },
      systemAsset: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    await expect(
      service.updateSystemAsset('project', 'asset', 'owner', 'company', {
        lifecycleStage: 'PILOT',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.systemAsset.update).not.toHaveBeenCalled();
  });

  it('does not create stakeholders outside the active company', async () => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'other-company',
          ownerId: 'owner',
          reviewerId: null,
          approverId: null,
        }),
      },
      userCompany: { findUnique: jest.fn() },
      complianceStakeholder: { create: jest.fn() },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    await expect(
      service.createComplianceStakeholder('project', 'owner', 'company', {
        role: ComplianceStakeholderRole.PROVIDER,
        name: 'Example provider',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.complianceStakeholder.create).not.toHaveBeenCalled();
  });

  it('blocks finalization while required traceability links are missing', async () => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'company',
          ownerId: 'reviewer',
          reviewerId: 'reviewer',
          approverId: null,
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'reviewer',
          companyId: 'company',
          role: 'ADMIN',
        }),
      },
      assessment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'assessment',
          projectId: 'project',
          status: 'CLASSIFIED',
          packVersion: { version: '2026.10' },
          classifications: [],
        }),
      },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );
    jest.spyOn(service, 'getTraceabilityModel').mockResolvedValue({
      assessment: { id: 'assessment' },
      finalization: {
        ready: false,
        blockers: ['Link an asset to EU-AIA-ART-14-HUMAN-OVERSIGHT'],
      },
    } as never);

    await expect(
      service.finalizeAssessment(
        'project',
        'assessment',
        'reviewer',
        'company',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finalizes and versions an assessment after every blocker is resolved', async () => {
    const updated = {
      id: 'assessment',
      projectId: 'project',
      status: 'FINALIZED',
      versionNumber: 4,
      coverageScore: 92,
      assessorType: 'INTERNAL_AUDIT',
      assessmentDate: new Date('2026-10-31T00:00:00Z'),
    };
    const tx = {
      assessment: { update: jest.fn().mockResolvedValue(updated) },
      assessmentChangeLog: { create: jest.fn().mockResolvedValue({}) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'company',
          ownerId: 'reviewer',
          reviewerId: 'reviewer',
          approverId: null,
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'reviewer',
          companyId: 'company',
          role: 'ADMIN',
        }),
      },
      assessment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'assessment',
          projectId: 'project',
          status: 'CLASSIFIED',
          packVersion: { version: '2026.10' },
          classifications: [],
        }),
      },
      $transaction: jest.fn(
        async (command: (client: typeof tx) => Promise<unknown>) => command(tx),
      ),
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );
    jest.spyOn(service, 'getTraceabilityModel').mockResolvedValue({
      assessment: { id: 'assessment' },
      finalization: { ready: true, blockers: [] },
    } as never);

    await expect(
      service.finalizeAssessment(
        'project',
        'assessment',
        'reviewer',
        'company',
      ),
    ).resolves.toMatchObject({ status: 'FINALIZED', versionNumber: 4 });
    expect(tx.assessmentChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'FINALIZED', versionNumber: 4 }),
    });
  });
});
