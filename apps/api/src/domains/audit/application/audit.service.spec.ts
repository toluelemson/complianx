import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('stores append-only compliance events with server metadata', async () => {
    const events: Array<Record<string, unknown>> = [];
    const prisma = {
      auditEvent: {
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          events.push(data);
          return data;
        }),
      },
    };
    const service = new AuditService(prisma as never);

    const first = await service.record({
      companyId: 'company-1',
      projectId: 'project-1',
      actorId: 'user-1',
      entityType: 'Assessment',
      entityId: 'assessment-1',
      action: 'CREATED',
      metadata: { correlationId: 'request-1', packVersion: 'pack-1' },
    });

    expect(first).toMatchObject({
      correlationId: 'request-1',
      packVersion: 'pack-1',
    });
    expect(events).toHaveLength(1);
  });

  it('preserves before and after snapshots for lifecycle decisions', async () => {
    const create = jest.fn(({ data }: { data: Record<string, unknown> }) => data);
    const service = new AuditService({ auditEvent: { create } } as never);

    await service.record({
      companyId: 'company-1',
      projectId: 'project-1',
      actorId: 'reviewer-1',
      entityType: 'SectionArtifact',
      entityId: 'artifact-1',
      action: 'REVIEWED',
      beforeSnapshot: { status: 'PENDING' },
      afterSnapshot: { status: 'APPROVED' },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REVIEWED',
          beforeSnapshot: { status: 'PENDING' },
          afterSnapshot: { status: 'APPROVED' },
          createdAt: expect.any(Date),
        }),
      }),
    );
  });
});
