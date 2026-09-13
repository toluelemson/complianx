import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { validateSync } from 'class-validator';
import { UpdateFindingDto } from '../../presentation/dto/update-finding.dto';
import { UpdateComplianceActionDto } from '../../presentation/dto/update-compliance-action.dto';
import { AuditService } from '../../../audit/application/audit.service';

describe('Compliance mutation boundaries', () => {
  function setup(user = 'owner', company = 'company') {
    const finding = {
      id: 'finding',
      projectId: 'project',
      obligationId: 'obligation',
      status: 'READY_FOR_REVIEW',
      resolutionSummary: 'Remediated',
      resolvedAt: new Date(),
    };
    const action = {
      id: 'action',
      obligationId: 'obligation',
      findingId: 'finding',
      status: 'COMPLETED',
      closureEvidenceId: 'link',
      closureNotes: 'Validated',
      obligation: { projectId: 'project' },
    };
    const tx = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'company',
          ownerId: 'owner',
          reviewerId: 'reviewer',
          approverId: 'approver',
        }),
        findFirst: jest.fn().mockResolvedValue({ id: 'project' }),
      },
      userCompany: {
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(
            where.userId_companyId.userId === 'outsider'
              ? null
              : {
                  companyId: 'company',
                  role:
                    where.userId_companyId.userId === 'admin'
                      ? 'ADMIN'
                      : 'USER',
                },
          ),
        ),
      },
      finding: {
        findFirst: jest.fn().mockResolvedValue(finding),
        findUnique: jest.fn().mockResolvedValue(finding),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }) =>
          Promise.resolve({ id: 'finding', ...data }),
        ),
        update: jest.fn(({ data }) => Promise.resolve({ ...finding, ...data })),
      },
      aiSystemObligation: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'obligation', projectId: 'project' }),
      },
      complianceAction: {
        findMany: jest.fn().mockResolvedValue([action]),
        findUnique: jest.fn().mockResolvedValue(action),
        create: jest.fn(({ data }) =>
          Promise.resolve({ id: 'action', ...data }),
        ),
        update: jest.fn(({ data }) => Promise.resolve({ ...action, ...data })),
      },
      obligationEvidence: {
        findFirst: jest.fn().mockResolvedValue({
          artifact: {
            projectId: 'project',
            status: 'APPROVED',
            expiresAt: null,
          },
        }),
      },
      classificationResult: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'classification',
          category: 'HIGH_RISK',
          reviewStatus: 'PENDING',
        }),
        update: jest.fn(({ data }) =>
          Promise.resolve({ id: 'classification', ...data }),
        ),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { ...tx, $transaction: jest.fn((fn) => fn(tx)) };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );
    return { service, tx, prisma, finding, action, user, company };
  }
  it.each(['member', 'outsider'])('rejects mutation by %s', async (user) => {
    const { service, tx } = setup();
    await expect(
      service.createFinding('project', user, 'company', {
        source: 'MANUAL_REVIEW',
        severity: 'HIGH',
        description: 'Gap',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.finding.create).not.toHaveBeenCalled();
  });
  it.each(['finding', 'obligation', 'createAction', 'updateAction'])(
    'rejects member mutation of %s',
    async (command) => {
      const { service } = setup();
      const call =
        command === 'finding'
          ? service.updateFinding('project', 'finding', 'member', 'company', {
              description: 'Edited',
            })
          : command === 'obligation'
            ? service.updateObligation(
                'project',
                'obligation',
                'member',
                'company',
                { status: 'COMPLETE' },
              )
            : command === 'createAction'
              ? service.createAction(
                  'project',
                  'obligation',
                  'member',
                  'company',
                  { title: 'Fix' },
                )
              : service.updateAction('project', 'action', 'member', 'company', {
                  status: 'COMPLETED',
                });
      await expect(call).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
  it('rejects null closure and lifecycle fields at the DTO boundary', () => {
    const finding = Object.assign(new UpdateFindingDto(), {
      status: null,
      resolutionSummary: null,
      reviewerDecision: null,
    });
    const action = Object.assign(new UpdateComplianceActionDto(), {
      closureEvidenceId: null,
      closureNotes: null,
      status: null,
    });
    expect(validateSync(finding)).toHaveLength(3);
    expect(validateSync(action)).toHaveLength(3);
  });
  it('rejects cross-company access before writing', async () => {
    const { service, tx } = setup();
    await expect(
      service.createFinding('project', 'owner', 'other-company', {
        source: 'MANUAL_REVIEW',
        severity: 'HIGH',
        description: 'Gap',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.finding.create).not.toHaveBeenCalled();
  });
  it.each(['owner', 'reviewer', 'approver', 'admin'])(
    'allows authorized %s to create a finding with a transactional audit',
    async (user) => {
      const { service, tx } = setup();
      await service.createFinding('project', user, 'company', {
        source: 'MANUAL_REVIEW',
        severity: 'HIGH',
        description: 'Gap',
      });
      expect(tx.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: user,
            companyId: 'company',
          }),
        }),
      );
    },
  );
  it('GET findings has no writes or transaction', async () => {
    const { service, tx, prisma } = setup();
    await service.listFindings('project', 'member', 'company');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.finding.create).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
  it.each(['finding', 'action'])(
    'rejects an external %s owner',
    async (kind) => {
      const { service } = setup();
      const call =
        kind === 'finding'
          ? service.createFinding('project', 'owner', 'company', {
              source: 'MANUAL_REVIEW',
              severity: 'HIGH',
              description: 'Gap',
              ownerId: 'outsider',
            })
          : service.createAction('project', 'obligation', 'owner', 'company', {
              title: 'Fix',
              ownerId: 'outsider',
            });
      await expect(call).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('does not allow the owner to resolve a finding', async () => {
    const { service } = setup();
    await expect(
      service.updateFinding('project', 'finding', 'owner', 'company', {
        status: 'RESOLVED',
        reviewerDecision: 'Approved',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows an administrator to review a classification without assignment', async () => {
    const { service, tx } = setup();
    await service.reviewClassification(
      'project',
      'classification',
      'admin',
      'company',
      {
        status: 'REVIEWED',
        reason: 'Checked',
      },
    );
    expect(tx.classificationResult.update).toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin',
          entityType: 'ClassificationResult',
        }),
      }),
    );
  });
  it('rejects ordinary member classification review', async () => {
    const { service, tx } = setup();
    await expect(
      service.reviewClassification(
        'project',
        'classification',
        'member',
        'company',
        {
          status: 'REVIEWED',
          reason: 'Checked',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.classificationResult.update).not.toHaveBeenCalled();
  });
  it.each([
    'summary',
    'decision',
    'remediation',
    'evidence',
    'expired',
    'foreign',
  ])('rejects closure with missing or invalid %s', async (gap) => {
    const { service, tx, finding } = setup();
    if (gap === 'summary') finding.resolutionSummary = '';
    if (gap === 'remediation')
      tx.complianceAction.findMany.mockResolvedValue([]);
    if (gap === 'evidence')
      tx.obligationEvidence.findFirst.mockResolvedValue(null);
    if (gap === 'expired')
      tx.obligationEvidence.findFirst.mockResolvedValue({
        artifact: {
          projectId: 'project',
          status: 'APPROVED',
          expiresAt: new Date(0),
        },
      });
    if (gap === 'foreign')
      tx.obligationEvidence.findFirst.mockResolvedValue({
        artifact: { projectId: 'foreign', status: 'APPROVED', expiresAt: null },
      });
    await expect(
      service.updateFinding('project', 'finding', 'reviewer', 'company', {
        status: 'RESOLVED',
        reviewerDecision: gap === 'decision' ? '' : 'Approved',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.finding.update).not.toHaveBeenCalled();
  });
  it('resolves with reviewed remediation and clears decision and timestamp on reopening', async () => {
    const { service, finding } = setup();
    const resolved = await service.updateFinding(
      'project',
      'finding',
      'reviewer',
      'company',
      { status: 'RESOLVED', reviewerDecision: 'Approved' },
    );
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
    finding.status = 'RESOLVED';
    const reopened = await service.updateFinding(
      'project',
      'finding',
      'owner',
      'company',
      { status: 'REOPENED' },
    );
    expect(reopened).toMatchObject({
      resolvedAt: null,
      reviewerDecision: null,
    });
  });
  it('rejects direct OPEN to RESOLVED transitions', async () => {
    const { service, finding } = setup();
    finding.status = 'OPEN';
    await expect(
      service.updateFinding('project', 'finding', 'reviewer', 'company', {
        status: 'RESOLVED',
        reviewerDecision: 'Approved',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('validates closure evidence against the same project and obligation', async () => {
    const { service, tx } = setup();
    await service.updateFinding('project', 'finding', 'reviewer', 'company', {
      status: 'RESOLVED',
      reviewerDecision: 'Approved',
    });
    expect(tx.obligationEvidence.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'link',
          aiSystemObligationId: 'obligation',
          obligation: { projectId: 'project' },
        }),
      }),
    );
  });
});
