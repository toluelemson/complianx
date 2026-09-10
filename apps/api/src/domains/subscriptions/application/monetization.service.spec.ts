import { BadRequestException } from '@nestjs/common';
import { MonetizationService } from './monetization.service';

describe('MonetizationService document reservations', () => {
  const prisma = {
    project: { findUnique: jest.fn(), count: jest.fn() },
    company: { findUnique: jest.fn() },
    companyUsage: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    documentQuotaReservation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };
  const service = new MonetizationService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MONETIZATION_ENABLED = 'true';
    process.env.FREE_DOCS_PER_MONTH = '3';
    prisma.project.findUnique.mockResolvedValue({ companyId: 'company-1' });
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      plan: 'FREE',
    });
    prisma.companyUsage.upsert.mockResolvedValue({});
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ docsGenerated: 0 }]);
    prisma.documentQuotaReservation.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    });
    prisma.documentQuotaReservation.create.mockResolvedValue({
      id: 'reservation-1',
      companyId: 'company-1',
      month: '2026-09',
      amount: 1,
      status: 'ACTIVE',
      expiresAt: new Date(),
      createdAt: new Date(),
      committedAt: null,
      releasedAt: null,
      operationKey: null,
    });
  });

  it('reserves quota atomically and commits it only after a document exists', async () => {
    const reservation = await service.reserveDocumentsForProject('project-1');

    expect(reservation).toEqual(
      expect.objectContaining({ companyId: 'company-1', amount: 1 }),
    );
    prisma.documentQuotaReservation.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      service.commitDocumentReservation(reservation),
    ).resolves.toBeUndefined();
    expect(prisma.documentQuotaReservation.updateMany).toHaveBeenCalled();
  });

  it('blocks AI-system creation when the plan capacity is reached', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      plan: 'FREE',
    });
    prisma.project.count.mockResolvedValue(3);
    await expect(
      service.assertCanAddAiSystem('company-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYWALL', limit: 3 }),
    });
  });

  it('rejects a reservation when the atomic quota update cannot claim capacity', async () => {
    prisma.$transaction.mockImplementationOnce(async () => {
      throw new BadRequestException('Monthly document limit reached');
    });
    await expect(
      service.reserveDocumentsForProject('project-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses a completed reservation and refreshes released attempts', async () => {
    const committed = { id: 'done', status: 'COMMITTED', operationKey: 'op-1' };
    prisma.documentQuotaReservation.findFirst.mockResolvedValueOnce(committed);
    await expect(
      service.reserveDocumentsForProject('project-1', 1, 'op-1'),
    ).resolves.toBe(committed);
    expect(prisma.documentQuotaReservation.update).not.toHaveBeenCalled();

    const released = {
      id: 'released',
      status: 'RELEASED',
      operationKey: 'op-2',
    };
    prisma.documentQuotaReservation.findFirst.mockResolvedValueOnce(released);
    prisma.documentQuotaReservation.update.mockResolvedValueOnce({
      ...released,
      status: 'ACTIVE',
    });
    await expect(
      service.reserveDocumentsForProject('project-1', 1, 'op-2'),
    ).resolves.toEqual(expect.objectContaining({ status: 'ACTIVE' }));
  });

  it('scopes operation-key retries to the current company and month', async () => {
    prisma.documentQuotaReservation.findFirst.mockResolvedValue(null);
    await service.reserveDocumentsForProject('project-1', 1, 'shared-key');
    expect(prisma.documentQuotaReservation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          operationKey: 'shared-key',
          companyId: 'company-1',
          month: expect.any(String),
        }),
      }),
    );
  });

  it('releases a failed reservation without incrementing generated documents', async () => {
    prisma.documentQuotaReservation.updateMany.mockResolvedValue({ count: 1 });
    await service.releaseDocumentReservation({
      id: 'reservation-1',
      companyId: 'company-1',
      month: '2026-09',
      amount: 1,
      status: 'ACTIVE',
    });
    expect(prisma.documentQuotaReservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'reservation-1', status: 'ACTIVE' },
        data: { status: 'RELEASED', releasedAt: expect.any(Date) },
      }),
    );
  });
});
