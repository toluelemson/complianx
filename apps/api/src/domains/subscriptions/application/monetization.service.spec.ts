import { BadRequestException } from '@nestjs/common';
import { MonetizationService } from './monetization.service';

describe('MonetizationService document reservations', () => {
  const prisma = {
    project: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    companyUsage: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
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
  });

  it('reserves quota atomically and commits it only after a document exists', async () => {
    prisma.$executeRaw.mockResolvedValue(1);
    const reservation = await service.reserveDocumentsForProject('project-1');

    expect(reservation).toEqual(
      expect.objectContaining({ companyId: 'company-1', amount: 1 }),
    );
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);

    prisma.companyUsage.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      service.commitDocumentReservation(reservation),
    ).resolves.toBeUndefined();
    expect(prisma.companyUsage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          docsReserved: { decrement: 1 },
          docsGenerated: { increment: 1 },
        },
      }),
    );
  });

  it('rejects a reservation when the atomic quota update cannot claim capacity', async () => {
    prisma.$executeRaw.mockResolvedValue(0);
    await expect(
      service.reserveDocumentsForProject('project-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('releases a failed reservation without incrementing generated documents', async () => {
    prisma.companyUsage.updateMany.mockResolvedValue({ count: 1 });
    await service.releaseDocumentReservation({
      companyId: 'company-1',
      month: '2026-09',
      amount: 1,
    });
    expect(prisma.companyUsage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { docsReserved: { decrement: 1 } },
      }),
    );
  });
});
