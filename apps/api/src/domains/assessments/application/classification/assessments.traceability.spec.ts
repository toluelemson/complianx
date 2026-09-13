import { AssessmentsService } from './assessments.service';
import { ProjectsService } from '../../../ai-systems/application/projects/projects.service';
import { AuditService } from '../../../audit/application/audit.service';

describe('Requirement traceability', () => {
  it('returns reviewer, human approval, and package inclusion identities', async () => {
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project',
          companyId: 'company',
          ownerId: 'owner',
        }),
      },
      userCompany: {
        findUnique: jest.fn().mockResolvedValue({
          companyId: 'company',
          role: 'USER',
        }),
      },
      aiSystemObligation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'system-obligation',
          status: 'COMPLETE',
          approvalState: 'APPROVED',
          ownerId: 'owner',
          priority: 'HIGH',
          dueAt: null,
          applicabilityReason: 'High-risk system',
          obligation: {
            id: 'obligation',
            key: 'EUAI-HO-1',
            title: 'Human oversight',
            description: 'Document human oversight measures.',
            legalReference: 'Article 14',
            packVersion: {
              id: 'pack',
              key: 'EU_AI_ACT',
              version: '2026.1',
              legalInstrument: 'EU AI Act',
              sourceUrl: 'https://example.test/eu-ai-act',
            },
          },
          classificationResult: null,
          evidence: [
            {
              id: 'link',
              artifact: {
                id: 'artifact',
                originalName: 'oversight.pdf',
                version: 2,
                checksum: 'checksum',
                createdAt: new Date('2026-09-11T00:00:00Z'),
                uploadedById: 'owner',
                uploadedBy: { id: 'owner', email: 'owner@example.com' },
                reviewedById: 'reviewer',
                reviewedBy: { id: 'reviewer', email: 'jane@example.com' },
                reviewedAt: new Date('2026-09-12T00:00:00Z'),
                status: 'APPROVED',
              },
              document: null,
            },
          ],
          actions: [],
          findings: [],
        }),
      },
      compliancePackage: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'package',
            version: 4,
            createdAt: new Date('2026-09-13T00:00:00Z'),
            manifest: { obligations: [{ id: 'system-obligation' }] },
          },
        ]),
      },
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            afterSnapshot: { approvalState: 'APPROVED' },
            actor: { id: 'approver', email: 'john@example.com' },
            createdAt: new Date('2026-09-13T00:00:00Z'),
          },
        ]),
      },
    };
    const service = new AssessmentsService(
      prisma as never,
      new ProjectsService(prisma as never),
      {} as never,
      new AuditService(prisma as never),
    );

    const result = await service.getObligationTraceability(
      'project',
      'system-obligation',
      'owner',
      'company',
    );

    expect(result.evidence[0].artifact).toMatchObject({
      evidenceVersion: 2,
      reviewer: { email: 'jane@example.com' },
    });
    expect(result.review.approval).toMatchObject({
      actor: { email: 'john@example.com' },
    });
    expect(result.packageInclusion[0]).toMatchObject({
      version: 4,
      included: true,
    });
  });
});
