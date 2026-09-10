import { BadRequestException } from '@nestjs/common';
import { MonetizationService } from './monetization.service';

describe('MonetizationService document reservations', () => {
  const prisma = {
    project: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    companyUsage: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    documentQuotaReservation: {
      findUnique: jest.fn(),
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

  it('rejects a reservation when the atomic quota update cannot claim capacity', async () => {
    prisma.$transaction.mockImplementationOnce(async () => {
      throw new BadRequestException('Monthly document limit reached');
    });
    await expect(
      service.reserveDocumentsForProject('project-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
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
